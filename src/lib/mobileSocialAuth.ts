import { prisma } from '@/lib/prisma';
import { signMobileToken } from '@/lib/mobileAuth';
import { ensureUserOrganizationByEmail } from '@/lib/organizationProvisioning';

type SocialAuthInput = {
    provider: 'google' | 'apple';
    providerAccountId: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
};

function normalizeEmail(email?: string | null) {
    return email?.trim().toLowerCase() || null;
}

async function buildMobileSession(userId: string, orgId: string, email: string, role: string) {
    const [user, organization, token] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        }),
        prisma.organization.findUnique({
            where: { id: orgId },
            select: {
                id: true,
                name: true,
                tier: true,
                credits: true,
                extracts: true,
            },
        }),
        signMobileToken({
            userId,
            email,
            orgId,
            role,
        }),
    ]);

    return {
        token,
        user,
        organization,
    };
}

export async function upsertMobileSocialUser(input: SocialAuthInput) {
    const providerAccountId = input.providerAccountId.trim();
    const email = normalizeEmail(input.email);
    const name = input.name?.trim() || null;
    const image = input.image?.trim() || null;

    if (!providerAccountId) {
        throw new Error('Missing provider account identifier.');
    }

    const existingAccount = await prisma.account.findUnique({
        where: {
            provider_providerAccountId: {
                provider: input.provider,
                providerAccountId,
            },
        },
        include: {
            user: true,
        },
    });

    if (existingAccount?.user) {
        const updatedUser = await prisma.user.update({
            where: { id: existingAccount.user.id },
            data: {
                email: existingAccount.user.email || email,
                name: name || existingAccount.user.name,
                image: image || existingAccount.user.image,
                emailVerified: existingAccount.user.emailVerified || (email ? new Date() : existingAccount.user.emailVerified),
            },
        });

        const resolvedEmail = updatedUser.email?.trim().toLowerCase() || email;
        if (!resolvedEmail) {
            throw new Error('This Apple account is missing an email address. Remove the app authorization in Apple ID settings and try again.');
        }

        const orgId = updatedUser.orgId || await ensureUserOrganizationByEmail(resolvedEmail);
        if (!orgId) {
            throw new Error('Failed to provision organization.');
        }

        return buildMobileSession(updatedUser.id, orgId, resolvedEmail, updatedUser.role || 'USER');
    }

    if (!email) {
        throw new Error('This account did not provide an email address. Remove the app authorization in your provider settings and try again.');
    }

    const existingUser = await prisma.user.findFirst({
        where: {
            email: {
                equals: email,
                mode: 'insensitive',
            },
        },
    });

    const user = existingUser
        ? await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                email,
                name: name || existingUser.name,
                image: image || existingUser.image,
                emailVerified: existingUser.emailVerified || new Date(),
            },
        })
        : await prisma.user.create({
            data: {
                email,
                name: name || email.split('@')[0],
                image,
                emailVerified: new Date(),
                role: 'USER',
            },
        });

    const orgId = user.orgId || await ensureUserOrganizationByEmail(email);
    if (!orgId) {
        throw new Error('Failed to provision organization.');
    }

    await prisma.account.upsert({
        where: {
            provider_providerAccountId: {
                provider: input.provider,
                providerAccountId,
            },
        },
        update: {
            userId: user.id,
            id_token: null,
        },
        create: {
            userId: user.id,
            type: 'oauth',
            provider: input.provider,
            providerAccountId,
            id_token: null,
        },
    });

    return buildMobileSession(user.id, orgId, email, user.role || 'USER');
}
