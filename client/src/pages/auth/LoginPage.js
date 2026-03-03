/**
 * Page de connexion / inscription
 * 
 * FONCTIONNALITÉS DÉJÀ IMPLÉMENTÉES:
 * - Connexion par email/mot de passe
 * - Inscription avec date de naissance + certification majorité
 * - Basculement entre modes Login / Register
 * 
 * TODO - FONCTIONNALITÉS À AJOUTER (demande-moi le code en commentaire):
 * 
 * 1. MOT DE PASSE OUBLIÉ
 *    - Lien "Mot de passe oublié ?" sous le champ mot de passe
 *    - Page ou modal pour saisir l'email
 *    - Appel api.forgotPassword(email)
 *    - Page pour saisir le code reçu par email + nouveau mot de passe
 *    - Appel api.resetPassword({ email, code, newPassword, confirmPassword })
 * 
 * 2. LIENS VERS CGU / POLITIQUE DE CONFIDENTIALITÉ
 *    - Ajouter des liens cliquables vers /legal?type=cgu et /legal?type=privacy
 *    - Créer la page LegalPage.js qui affiche le contenu selon le paramètre type
 * 
 * 3. VALIDATION DES CHAMPS EN TEMPS RÉEL
 *    - Afficher des messages d'erreur sous chaque champ (email invalide, mot de passe trop court, etc.)
 *    - Utiliser des états comme: emailError, passwordError, etc.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  useEffect(() => {
    if (searchParams.get('mode') === 'register') setMode('register');
  }, [searchParams]);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [certifiedMajor, setCertifiedMajor] = useState(false);
  const [acceptedCgu, setAcceptedCgu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!birthDate || !certifiedMajor || !acceptedCgu) {
        setError('Remplis tous les champs et accepte les CGU.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }
      if (password.length < 6) {
        setError('Le mot de passe doit faire au moins 6 caractères.');
        return;
      }
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await login({ email, password });
      } else {
        result = await register({ email, username, password, birthDate, certifiedMajor });
      }
      if (result?.success) {
        navigate('/feed');
      } else {
        setError(result?.error || 'Erreur');
      }
    } catch (err) {
      setError(err?.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleBirthDateChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
    if (v.length >= 5) v = v.slice(0, 5) + '/' + v.slice(5, 9);
    setBirthDate(v);
  };

  return (
    <div className="min-h-screen bg-insane-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-insane-orange rounded-2xl flex items-center justify-center">
            <span className="text-insane-black font-black text-2xl">I</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-insane-white mb-6">
          {mode === 'login' ? 'Connexion' : 'Inscription'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-insane-white/70 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-insane-gray border border-insane-orange/50 rounded-lg px-4 py-3 text-insane-white focus:outline-none focus:ring-2 focus:ring-insane-orange"
              placeholder="ton@email.com"
              required
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm text-insane-white/70 mb-1">Pseudo</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-insane-gray border border-insane-orange/50 rounded-lg px-4 py-3 text-insane-white focus:outline-none focus:ring-2 focus:ring-insane-orange"
                placeholder="mon_pseudo"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-insane-white/70 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-insane-gray border border-insane-orange/50 rounded-lg px-4 py-3 text-insane-white focus:outline-none focus:ring-2 focus:ring-insane-orange"
              placeholder="••••••••"
              required
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm text-insane-white/70 mb-1">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-insane-gray border border-insane-orange/50 rounded-lg px-4 py-3 text-insane-white focus:outline-none focus:ring-2 focus:ring-insane-orange"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-insane-white/70 mb-1">Date de naissance (jj/mm/aaaa)</label>
                <input
                  type="text"
                  value={birthDate}
                  onChange={handleBirthDateChange}
                  placeholder="jj/mm/aaaa"
                  maxLength={10}
                  className="w-full bg-insane-gray border border-insane-orange/50 rounded-lg px-4 py-3 text-insane-white focus:outline-none focus:ring-2 focus:ring-insane-orange"
                />
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="certifiedMajor"
                  checked={certifiedMajor}
                  onChange={(e) => setCertifiedMajor(e.target.checked)}
                  className="mt-1 rounded border-insane-orange"
                />
                <label htmlFor="certifiedMajor" className="text-sm text-insane-white/80">
                  Je certifie avoir 18 ans ou plus
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="acceptedCgu"
                  checked={acceptedCgu}
                  onChange={(e) => setAcceptedCgu(e.target.checked)}
                  className="mt-1 rounded border-insane-orange"
                />
                <label htmlFor="acceptedCgu" className="text-sm text-insane-white/80">
                  J'accepte les CGU et la politique de confidentialité
                </label>
              </div>
            </>
          )}

          {error && (
            <div className="text-red-400 text-sm bg-red-900/30 rounded-lg p-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-insane-orange text-insane-black font-bold py-3 rounded-lg hover:bg-orange-500 transition disabled:opacity-50"
          >
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <p className="text-center text-insane-white/60 text-sm mt-6">
          {mode === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-insane-orange font-medium hover:underline"
          >
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
