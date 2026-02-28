import { getAiConfig } from '@/app/actions/settings';
import { verifyAuth } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { SettingsForm } from './SettingsForm';

export default async function AiSettingsDashboard() {
    const session = await verifyAuth();
    if (!session) redirect('/signup');

    const config = await getAiConfig();

    return (
        <div className="min-h-screen bg-[#0A0A0A] p-8 text-gray-100 max-w-5xl mx-auto">
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AI Agent Settings</h1>
                    <p className="text-gray-400 font-light text-sm">Configure your Twilio SMS responders, Voice AI parameters, and OpenAI master prompts.</p>
                </div>
            </div>

            <SettingsForm initialConfig={config} />
        </div>
    );
}
