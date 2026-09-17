export function createEmailPasswordApiMethods({ apiRequest, getMimeType, getFileName, API_CONFIG }) {
  return {
  // =========================================================================
  // EMAIL VERIFICATION / PASSWORD RESET
  // =========================================================================
  sendEmailVerificationCode: async (token) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest('/api/user/me/email/verification/send', { method: 'POST', noCache: true }, token);
  },
  confirmEmailVerificationCode: async (token, code) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!code) throw new Error('Code requis.');
    return apiRequest(
      '/api/user/me/email/verification/confirm',
      { method: 'POST', body: JSON.stringify({ code: String(code).trim() }) },
      token
    );
  },
  changeUnverifiedEmail: async (token, email) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!email) throw new Error('Email requis.');
    return apiRequest(
      '/api/user/me/email/change',
      { method: 'POST', body: JSON.stringify({ email: String(email).trim() }), noCache: true },
      token
    );
  },
  forgotPassword: async (email) => {
    return apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: (email || '').toString().trim() }),
    });
  },
  resetPassword: async ({ email, code, newPassword, confirmPassword }) => {
    return apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email: (email || '').toString().trim(),
        code: (code || '').toString().trim(),
        newPassword: (newPassword || '').toString(),
        confirmPassword: (confirmPassword || '').toString(),
      }),
    });
  },
  };
}
