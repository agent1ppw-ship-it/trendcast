import crypto from 'crypto';

interface S3Config {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
}

function getS3Config(): S3Config | null {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
    const bucket = process.env.AWS_S3_BUCKET;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = process.env.AWS_SESSION_TOKEN;

    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
        return null;
    }

    return { region, bucket, accessKeyId, secretAccessKey, sessionToken };
}

function sha256Hex(value: Buffer | string) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function hmac(key: Buffer | string, value: string, encoding?: crypto.BinaryToTextEncoding) {
    const digest = crypto.createHmac('sha256', key).update(value, 'utf8').digest();
    return encoding ? digest.toString(encoding) : digest;
}

function toAmzDate(date: Date) {
    const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    return {
        amzDate: iso,
        dateStamp: iso.slice(0, 8),
    };
}

function canonicalUriFromKey(key: string) {
    return `/${key.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`;
}

function encodeRfc3986(value: string) {
    return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function getSigningKey(secret: string, dateStamp: string, region: string, service: string) {
    const kDate = hmac(`AWS4${secret}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    return hmac(kService, 'aws4_request');
}

function hostForConfig(config: S3Config) {
    return `${config.bucket}.s3.${config.region}.amazonaws.com`;
}

export function canUseS3Storage() {
    return Boolean(getS3Config());
}

export async function uploadBufferToS3(key: string, buffer: Buffer, contentType: string) {
    const config = getS3Config();
    if (!config) {
        throw new Error('S3 is not configured. Missing AWS_REGION/AWS_S3_BUCKET/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY.');
    }

    const method = 'PUT';
    const service = 's3';
    const now = new Date();
    const { amzDate, dateStamp } = toAmzDate(now);
    const host = hostForConfig(config);
    const canonicalUri = canonicalUriFromKey(key);
    const payloadHash = sha256Hex(buffer);

    const signedHeaderNames = ['host', 'x-amz-content-sha256', 'x-amz-date'];
    if (config.sessionToken) signedHeaderNames.push('x-amz-security-token');
    const signedHeaders = signedHeaderNames.join(';');

    let canonicalHeaders = `host:${host}\n`;
    canonicalHeaders += `x-amz-content-sha256:${payloadHash}\n`;
    canonicalHeaders += `x-amz-date:${amzDate}\n`;
    if (config.sessionToken) canonicalHeaders += `x-amz-security-token:${config.sessionToken}\n`;

    const canonicalRequest = [
        method,
        canonicalUri,
        '',
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256Hex(canonicalRequest),
    ].join('\n');

    const signingKey = getSigningKey(config.secretAccessKey, dateStamp, config.region, service);
    const signature = hmac(signingKey, stringToSign, 'hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
        Authorization: authorization,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'content-type': contentType,
    };
    if (config.sessionToken) headers['x-amz-security-token'] = config.sessionToken;

    const url = `https://${host}${canonicalUri}`;
    const response = await fetch(url, {
        method,
        headers,
        body: new Uint8Array(buffer),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`S3 upload failed (${response.status}): ${body}`);
    }
}

export function createSignedS3GetUrl(key: string, expiresInSeconds = 3600) {
    const config = getS3Config();
    if (!config) {
        throw new Error('S3 is not configured.');
    }

    const method = 'GET';
    const service = 's3';
    const now = new Date();
    const { amzDate, dateStamp } = toAmzDate(now);
    const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
    const host = hostForConfig(config);
    const canonicalUri = canonicalUriFromKey(key);

    const queryEntries: Array<[string, string]> = [
        ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
        ['X-Amz-Credential', `${config.accessKeyId}/${credentialScope}`],
        ['X-Amz-Date', amzDate],
        ['X-Amz-Expires', String(expiresInSeconds)],
        ['X-Amz-SignedHeaders', 'host'],
    ];

    if (config.sessionToken) {
        queryEntries.push(['X-Amz-Security-Token', config.sessionToken]);
    }

    queryEntries.sort((a, b) => a[0].localeCompare(b[0]));
    const canonicalQuery = queryEntries.map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`).join('&');

    const canonicalRequest = [
        method,
        canonicalUri,
        canonicalQuery,
        `host:${host}\n`,
        'host',
        'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256Hex(canonicalRequest),
    ].join('\n');

    const signingKey = getSigningKey(config.secretAccessKey, dateStamp, config.region, service);
    const signature = hmac(signingKey, stringToSign, 'hex');

    return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
