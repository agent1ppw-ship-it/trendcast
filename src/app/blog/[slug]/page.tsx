import { permanentRedirect } from 'next/navigation';

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    permanentRedirect(`/hub/${slug}`);
}
