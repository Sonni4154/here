declare module 'intuit-oauth' {
  export interface TokenResponse {
    token: {
      access_token: string;
      refresh_token: string;
      token_type?: string;
      expires_in?: number;
      scope?: string;
      realmId?: string;
    };
    authResponse?: any;
  }

  export interface OAuthOptions {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
    redirectUri: string;
  }

  export interface AuthorizeUriOptions {
    scope: string[];
    state?: string;
  }

  export interface TokenOptions {
    access_token?: string;
    refresh_token?: string;
  }

  export default class OAuthClient {
    static scopes: {
      Accounting: string;
      Payments: string;
      Payroll: string;
      TimeTracking: string;
    };

    constructor(options: OAuthOptions);
    
    authorizeUri(options: AuthorizeUriOptions): string;
    createToken(authCode: string): Promise<TokenResponse>;
    refresh(): Promise<TokenResponse>;
    revoke(): Promise<any>;
    setToken(token: TokenOptions): void;
  }
}