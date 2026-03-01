'use server';

export async function submitDemoRequest(data: { name: string; email: string; company: string }) {
    // In a production environment, this would save to a PostgreSQL Waitlist/Demo table
    // or trigger an email via Resend/SendGrid to the sales team.
    console.log("\n=============================");
    console.log("🎯 NEW DEMO REQUEST RECEIVED!");
    console.log(`Name:    ${data.name}`);
    console.log(`Email:   ${data.email}`);
    console.log(`Company: ${data.company}`);
    console.log("=============================\n");

    // Artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { success: true };
}
