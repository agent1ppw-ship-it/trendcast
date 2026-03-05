import { Metadata } from 'next';
import { ContractorForumsClient } from '@/components/ContractorForumsClient';

export const metadata: Metadata = {
    title: 'Contractor Forums | Trendcast',
    description: 'Contractor community for AI discussions, job posts, and company promotions across home service industries.',
};

export default function HubIndexPage() {
    return <ContractorForumsClient />;
}
