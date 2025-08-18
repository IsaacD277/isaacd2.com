import { UserManager } from "oidc-client-ts";

const cognitoAuthConfig = {
    authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KSaXwW0Ls",
    client_id: "53lbka1er1uood579akb0at7c2",
    redirect_uri: "https://dev.isaacd2.com/newsletter",
    response_type: "code",
    scope: "email openid phone"
};

// create a UserManager instance
export const userManager = new UserManager({
    ...cognitoAuthConfig,
});

export async function signOutRedirect () {
    const clientId = "53lbka1er1uood579akb0at7c2";
    const logoutUri = "https://dev.isaacd2.com/newsletter";
    const cognitoDomain = "https://us-east-1ksaxww0ls.auth.us-east-1.amazoncognito.com";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
};
