import { prisma } from '@/lib/prisma';

async function findUserByEmail(email: string) {
    return prisma.user.findFirst({
        where: {
            email: {
                equals: email.trim(),
                mode: 'insensitive',
            },
        },
    });
}

export async function ensureUserOrganizationByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
        return null;
    }

    if (user.orgId) {
        if (user.role !== 'ADMIN') {
            await prisma.user.update({
                where: { id: user.id },
                data: { role: 'ADMIN' },
            });
        }

        return user.orgId;
    }

    const organization = await prisma.organization.create({
        data: {
            name: `${normalizedEmail.split('@')[0]}'s Business`,
            tier: 'INTRO',
            industry: 'Home Services',
            extracts: 20,
            credits: 100,
            aiSettings: {
                create: {
                    systemPrompt: 'You are a helpful home service estimator assistant.',
                    autoReplySMS: false,
                    autoSchedule: false,
                },
            },
        },
    });

    await prisma.user.update({
        where: { id: user.id },
        data: {
            orgId: organization.id,
            role: 'ADMIN',
        },
    });

    return organization.id;
}

export async function getUserAuthContextByEmail(email: string) {
    const user = await findUserByEmail(email);
    if (!user) return null;

    return {
        id: user.id,
        role: user.role || 'USER',
        orgId: user.orgId ?? null,
        email: user.email ?? null,
        name: user.name ?? null,
        image: user.image ?? null,
    };
}
