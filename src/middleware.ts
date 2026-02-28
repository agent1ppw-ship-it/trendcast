import { withAuth } from "next-auth/middleware"

export default withAuth({
    callbacks: {
        authorized: ({ req, token }) => {
            // Check if the user is authenticated (token exists)
            const isAuthenticated = !!token;

            if (!isAuthenticated) {
                return false;
            }
            return true;
        },
    },
    pages: {
        signIn: "/signup",
    },
});

export const config = {
    matcher: ['/dashboard/:path*'],
};
