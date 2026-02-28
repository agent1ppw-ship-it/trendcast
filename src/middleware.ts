import { withAuth } from "next-auth/middleware"

export default withAuth({
    callbacks: {
        authorized: ({ req, token }) => {
            console.log('--- MIDDLEWARE EXECUTING ---');
            console.log('Requested URL:', req.nextUrl.pathname);
            console.log('Middleware Token Exists?:', !!token);
            if (token) {
                console.log('Middleware Token Name:', token.name);
            } else {
                console.log('Middleware Cookies:', req.cookies.getAll());
            }

            const isAuthenticated = !!token;
            if (!isAuthenticated) return false;
            return true;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/signup",
    },
});

export const config = {
    matcher: ['/dashboard/:path*'],
};
