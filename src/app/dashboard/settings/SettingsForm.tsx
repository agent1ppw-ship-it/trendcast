'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Save, Settings2, MessageSquare, PhoneCall, Key, Bot } from 'lucide-react';
import { useState } from 'react';
import { saveAiConfig } from '@/app/actions/settings';

export function SettingsForm({ initialConfig }: { initialConfig: any }) {
    const [twilioNumber, setTwilioNumber] = useState(initialConfig?.twilioNumber || '');
    const [systemPrompt, setSystemPrompt] = useState(initialConfig?.systemPrompt || 'You are the virtual receptionist for TrendCast. You are speaking to a potential customer via SMS. Your Goal: Gather the required information to provide an accurate estimate or book an on-site inspection. Always remain highly professional and concise.');
    const [autoReplySMS, setAutoReplySMS] = useState(initialConfig?.autoReplySMS !== undefined ? initialConfig.autoReplySMS : true);
    const [autoSchedule, setAutoSchedule] = useState(initialConfig?.autoSchedule !== undefined ? initialConfig.autoSchedule : false);

    // UI mock states
    const [vapiId, setVapiId] = useState('agent_xyz123_abc987');
    const [voicePrompt, setVoicePrompt] = useState('You are a friendly scheduling assistant. Answer the phone warmly. Ask the caller what service they need, and consult the database calendar to offer two available timeslots over the next 3 days.');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await saveAiConfig({
            twilioNumber,
            systemPrompt,
            autoReplySMS,
            autoSchedule
        });
        setTimeout(() => setIsSaving(false), 500);
    };

    return (
        <>
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-end gap-4 -mt-16">
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all font-semibold"
                >
                    <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            <div className="space-y-8 pb-12">
                {/* General AI Behavior */}
                <Card className="bg-[#111] border-white/5 shadow-md">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-gray-400" /> Global Automation Rules
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-[#1A1A1A] cursor-pointer hover:border-white/10 transition-colors">
                                <div className="pt-1">
                                    <input
                                        type="checkbox"
                                        checked={autoReplySMS}
                                        onChange={(e) => setAutoReplySMS(e.target.checked)}
                                        className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500/50"
                                    />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-200 mb-1">Auto-Reply to Missed Calls</h4>
                                    <p className="text-xs text-gray-400 leading-relaxed">Instantly text a caller back if the line is busy or missed. Uses Twilio integration.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-[#1A1A1A] cursor-pointer hover:border-white/10 transition-colors">
                                <div className="pt-1">
                                    <input
                                        type="checkbox"
                                        checked={autoSchedule}
                                        onChange={(e) => setAutoSchedule(e.target.checked)}
                                        className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500/50"
                                    />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-200 mb-1">Autonomous Scheduling</h4>
                                    <p className="text-xs text-gray-400 leading-relaxed">Allow the AI to write events directly into your calendar once it qualifies a lead.</p>
                                </div>
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Text Messaging / Twilio */}
                <Card className="bg-[#111] border-white/5 shadow-md">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-400" /> SMS & Inbound Text (The Closer)
                        </CardTitle>
                        <CardDescription className="text-gray-400 font-light mt-2">Manage the personality and instructions for your text-marketing bot.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Twilio Registered Number</label>
                            <input
                                type="text"
                                value={twilioNumber}
                                onChange={(e) => setTwilioNumber(e.target.value)}
                                placeholder="+1 (234) 567-8900"
                                className="w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-blue-400 font-mono focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">System Instructions (Prompt)</label>
                            <textarea
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                rows={4}
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-sm leading-relaxed resize-y"
                            />
                            <p className="text-xs text-gray-500 mt-2">This dictates how the AI speaks to customers over text. Use variable syntax like <code className="bg-white/5 px-1 py-0.5 rounded text-gray-400">{`{{businessData.name}}`}</code>.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Voice AI / Vapi */}
                <Card className="bg-[#111] border-white/5 shadow-md relative overflow-hidden group opacity-60">
                    <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center pointer-events-none">
                        <span className="bg-black/80 px-4 py-2 rounded border border-white/10 text-white font-semibold flex items-center gap-2">
                            Only available on Enterprise Tier
                        </span>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                            <PhoneCall className="w-5 h-5 text-purple-400" /> Voice AI Agent (Enterprise)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vapi Agent ID</label>
                                <input
                                    type="text"
                                    value={vapiId}
                                    readOnly
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-purple-400 font-mono focus:outline-none transition-all"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Voice Model</label>
                                <select className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none transition-all appearance-none">
                                    <option>PlayHT - "Sarah" (Friendly Female)</option>
                                    <option>PlayHT - "Marcus" (Professional Male)</option>
                                    <option>ElevenLabs - "Rachel" (Conversational)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Spoken Instructions (Prompt)</label>
                            <textarea
                                value={voicePrompt}
                                readOnly
                                rows={3}
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-gray-300 focus:outline-none transition-all font-mono text-sm leading-relaxed resize-y"
                            />
                        </div>
                    </CardContent>
                </Card>

            </div>
        </>
    );
}
