import { redirect } from 'next/navigation';
import { ensureOrganization } from '@/app/actions/auth';
import { BlogPostsClient } from '@/components/BlogPostsClient';

export const dynamic = 'force-dynamic';

export default async function BlogPostsPage() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    return <BlogPostsClient />;
}
