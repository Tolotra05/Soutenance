'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Layers, Mail, Lock, Eye, EyeOff, Loader2, Sun, Moon, Shield, ShieldCheck, Briefcase, Wrench, User as UserIcon, ArrowLeft, CheckCircle2, Building2, Phone, UserPlus, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme-provider';
import { useSession } from '@/lib/contexts/session-context';
import { useUsers } from '@/lib/contexts/users-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UserAvatar } from '@/components/shared/user-avatar';
import { RoleBadge } from '@/components/shared/badges';
import { cn } from '@/lib/utils';
import type { Role, MemberSpecialty } from '@/types';

const demoAccounts: {
  role: Role;
  email: string;
  password: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  { role: 'admin',         email: 'sophie.laurent@proflow.io', password: 'admin123',   desc: 'Gère tous les projets',            icon: Shield,    accent: 'text-destructive' },
  { role: 'chef_de_projet',email: 'karim.benali@proflow.io',  password: 'manager123', desc: 'Chef de projet — pilote les projets', icon: Briefcase, accent: 'text-primary' },
  { role: 'membre',        email: 'thomas.dubois@proflow.io', password: 'employe123', desc: 'Membre — exécute les sous-tâches',   icon: Wrench,    accent: 'text-info' },
  { role: 'client',        email: 'camille@techstart.fr',     password: 'client123',  desc: 'Soumet et suit ses projets',        icon: UserIcon,  accent: 'text-chart-5' },
];

const registrationRoles: {
  role: 'client' | 'chef_de_projet' | 'membre';
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  { role: 'client',         label: 'Client',         desc: 'Soumettre vos projets et demandes de tâches', icon: UserIcon,  accent: 'text-chart-5' },
  { role: 'chef_de_projet', label: 'Chef de projet', desc: 'Piloter les projets et cadrer les tâches',     icon: Briefcase, accent: 'text-primary' },
  { role: 'membre',         label: 'Membre',         desc: 'Exécuter les sous-tâches assignées',           icon: Wrench,    accent: 'text-info' },
];

type AuthMode = 'login' | 'forgot' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, login } = useSession();
  const { users, register, requestPasswordReset, resetPassword, specialties } = useUsers();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<Role | null>(null);

  // Forgot password
  const [forgotStep, setForgotStep] = useState<'email' | 'code' | 'new'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotCodeInput, setForgotCodeInput] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Registration wizard
  const [regStep, setRegStep] = useState(1);
  const [regRole, setRegRole] = useState<'client' | 'chef_de_projet' | 'membre' | null>(null);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('');
  const [regError, setRegError] = useState('');
  const [regDone, setRegDone] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (currentUser && mounted) router.replace('/dashboard');
  }, [currentUser, mounted, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim() || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }
    setLoading(true);
    const target = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    login(email, password).then((ok) => {
      setLoading(false);
      if (ok) {
        router.push('/dashboard');
      } else if (target && (target.accountStatus === 'pending' || target.accountStatus === 'rejected')) {
        setEmail('');
        setPassword('');
        setError('Connexion impossible : votre compte est en attente de validation par un administrateur.');
      } else {
        setEmail('');
        setPassword('');
        setError('Email ou mot de passe incorrect. Consultez les comptes de démonstration ci-dessous.');
      }
    });
  };

  const handleDemoLogin = (account: (typeof demoAccounts)[number]) => {
    setError('');
    setDemoLoading(account.role);
    login(account.email, account.password).then((ok) => {
      setDemoLoading(null);
      if (ok) router.push('/dashboard');
    });
  };

  const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

  const sendCode = async () => {
    const { ok, devCode } = await requestPasswordReset(forgotEmail.trim());
    // devCode is only present in dev (no mailer configured, see AuthController::forgotPassword) --
    // displayed on screen exactly like the previous fully-local fake code, but now server-issued.
    // ok=false (network failure) falls back to a client-only code so the demo still works offline.
    setForgotCode(devCode ?? generateCode());
    setForgotCodeInput('');
    void ok;
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim()) {
      setForgotError('Veuillez renseigner votre adresse email.');
      return;
    }
    sendCode();
    setForgotStep('code');
  };

  const resendCode = () => {
    sendCode();
    setForgotError('');
  };

  const handleVerifyCode = () => {
    setForgotError('');
    if (forgotCodeInput !== forgotCode) {
      setForgotError('Code incorrect. Vérifiez le code reçu par email.');
      return;
    }
    setForgotStep('new');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (forgotNewPassword.length < 6) {
      setForgotError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Les mots de passe ne correspondent pas.');
      return;
    }
    const ok = await resetPassword(forgotEmail, forgotCode, forgotNewPassword);
    if (ok) {
      setMode('login');
      setEmail(forgotEmail);
      setPassword('');
      setForgotEmail('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotCode('');
      setForgotCodeInput('');
      setForgotStep('email');
      setError('');
      setInfo('Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.');
    } else {
      setForgotError('Aucun compte ne correspond à cet email.');
    }
  };

  const startRegistration = () => {
    setRegStep(1);
    setRegRole(null);
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirm('');
    setRegPhone('');
    setRegCompany('');
    setRegSpecialty('');
    setRegError('');
    setRegDone(false);
    setMode('register');
  };

  const goToStep = (step: number) => {
    setRegError('');
    if (step === 2) {
      if (!regRole) { setRegError('Choisissez le type de compte.'); return; }
    }
    if (step === 3) {
      if (!regName.trim()) { setRegError('Le nom est obligatoire.'); return; }
      if (!/^\S+@\S+\.\S+$/.test(regEmail.trim())) { setRegError('Adresse email invalide.'); return; }
      if (users.some((u) => u.email.toLowerCase() === regEmail.trim().toLowerCase())) { setRegError('Un compte existe déjà avec cet email.'); return; }
      if (regPassword.length < 6) { setRegError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
      if (regPassword !== regConfirm) { setRegError('Les mots de passe ne correspondent pas.'); return; }
      if (regRole === 'membre' && !regSpecialty) { setRegError('Précisez votre spécialité.'); return; }
    }
    setRegStep(step);
  };

  const submitRegistration = async () => {
    if (!regRole) return;
    const ok = await register({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      phone: regPhone.trim(),
      role: regRole,
      company: regCompany.trim() || undefined,
      memberSpecialty: regSpecialty ? (regSpecialty as MemberSpecialty) : undefined,
    });
    if (ok) setRegDone(true);
  };

  const renderHeader = (title: string, subtitle: string) => (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-bold tracking-tight mb-1.5">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background selection:bg-primary/10 overflow-hidden">
      {/* Left pane - Image & branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 flex-col justify-between p-10 xl:p-12">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=2070&auto=format&fit=crop"
            alt="Mountain lake landscape"
            fill
            sizes="50vw"
            className="object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        </div>

        <div className="relative z-10 flex items-center gap-3 text-white">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary shadow-soft-lg">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">TaskFlow</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white mb-5 leading-tight">
            Organisez vos idées, réalisez vos projets.
          </h1>
          <p className="text-lg text-white/80">
            Une plateforme moderne et intuitive pour gérer vos tâches efficacement, conçue pour les équipes exigeantes.
          </p>
        </div>
      </div>

      {/* Right pane - Auth forms */}
      <div className="flex-1 flex flex-col relative max-h-screen overflow-y-auto">
        <header className="absolute top-0 right-0 p-4 flex justify-end w-full">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            {mode === 'login' && (
              <>
                {renderHeader('Se connecter', 'Accédez à votre espace de travail.')}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-xs">Email</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="votre@email.com"
                        className="pl-9 h-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-xs">Mot de passe</Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="pl-9 pr-9 h-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        title={showPassword ? 'Masquer' : 'Afficher'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-2.5">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5" defaultChecked />
                        <span>Se souvenir de moi</span>
                      </label>
                      <button type="button" onClick={() => { setError(''); setInfo(''); setForgotError(''); setForgotStep('email'); setForgotCode(''); setForgotCodeInput(''); setForgotConfirmPassword(''); setMode('forgot'); }} className="text-xs font-medium text-primary hover:underline">
                        Mot de passe oublié ?
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2 animate-in fade-in zoom-in-95 duration-200">
                      {error}
                    </div>
                  )}
                  {info && (
                    <div className="rounded-lg bg-success/10 border border-success/30 text-success text-sm px-3 py-2 animate-in fade-in zoom-in-95 duration-200">
                      {info}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-10 shadow-soft-lg group relative overflow-hidden" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Se connecter'}
                    {!loading && <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-background px-3 text-muted-foreground font-medium tracking-wider">
                      Comptes de démonstration
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {demoAccounts.map((acc) => {
                    const demoUser = users.find((u) => u.email.toLowerCase() === acc.email.toLowerCase());
                    return (
                      <button
                        key={acc.role}
                        type="button"
                        disabled={demoLoading !== null}
                        onClick={() => handleDemoLogin(acc)}
                        className="group text-left flex items-center gap-2.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-soft-lg transition-all duration-300 p-2.5 disabled:opacity-60"
                      >
                        <div className="flex-shrink-0">
                          <UserAvatar user={demoUser} size="sm" className="shadow-sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors leading-tight">
                            {demoLoading === acc.role ? (
                              <Loader2 className="h-3 w-3 animate-spin inline" />
                            ) : (
                              demoUser?.name ?? acc.email
                            )}
                          </p>
                          <div className="mt-0.5">
                            <RoleBadge role={acc.role} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-center text-[11px] text-muted-foreground mt-6">
                  Pas encore de compte ? <button type="button" onClick={startRegistration} className="text-primary hover:underline font-medium">Créer un compte</button>
                </p>
              </>
            )}

{mode === 'forgot' && (
              <>
                <button type="button" onClick={() => { setError(''); setForgotError(''); setForgotStep('email'); setMode('login'); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
                </button>
                {renderHeader('Mot de passe oublié',
                  forgotStep === 'email' ? 'Confirmez votre adresse email pour recevoir un code de vérification.' :
                  forgotStep === 'code' ? 'Saisissez le code de confirmation reçu par email.' :
                  'Définissez votre nouveau mot de passe.')}

                {/* Étape 1 — confirmation de l'email */}
                {forgotStep === 'email' && (
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div>
                      <Label htmlFor="forgotEmail" className="text-xs">Email</Label>
                      <div className="relative mt-1.5">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgotEmail"
                          type="email"
                          autoComplete="email"
                          placeholder="votre@email.com"
                          className="pl-9 h-10"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {forgotError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2 animate-in fade-in zoom-in-95 duration-200">
                        {forgotError}
                      </div>
                    )}

                    <Button type="submit" className="w-full h-10 shadow-soft-lg">
                      <Mail className="h-4 w-4 mr-2" /> Envoyer le code de confirmation
                    </Button>
                  </form>
                )}

                {/* Étape 2 — confirmation du code */}
                {forgotStep === 'code' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5 text-foreground">
                        <Mail className="h-3.5 w-3.5 text-primary" /> Email de démonstration
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Aucun email réel n&apos;est envoyé (démo). Voici le code envoyé à{' '}
                        <span className="font-medium text-foreground">{forgotEmail}</span> :
                      </p>
                      <p className="mt-2 font-mono text-2xl font-bold tracking-[0.35em] text-primary">{forgotCode}</p>
                    </div>

                    <div>
                      <Label htmlFor="forgotCode" className="text-xs">Code de confirmation</Label>
                      <Input
                        id="forgotCode"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="••••••"
                        className="mt-1.5 h-10 text-center tracking-[0.5em] font-mono"
                        value={forgotCodeInput}
                        onChange={(e) => setForgotCodeInput(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>

                    {forgotError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2 animate-in fade-in zoom-in-95 duration-200">
                        {forgotError}
                      </div>
                    )}

                    <Button className="w-full h-10 shadow-soft-lg" onClick={handleVerifyCode} disabled={forgotCodeInput.length !== 6}>
                      <ShieldCheck className="h-4 w-4 mr-2" /> Vérifier le code
                    </Button>

                    <div className="flex items-center justify-between text-xs">
                      <button type="button" onClick={resendCode} className="text-primary font-medium hover:underline">
                        Renvoyer le code
                      </button>
                      <button type="button" onClick={() => { setForgotStep('email'); setForgotError(''); setForgotCode(''); }} className="text-muted-foreground hover:text-primary transition-colors">
                        Changer d&apos;email
                      </button>
                    </div>
                  </div>
                )}

                {/* Étape 3 — nouveau mot de passe */}
                {forgotStep === 'new' && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="forgotPassword" className="text-xs">Nouveau mot de passe</Label>
                      <div className="relative mt-1.5">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgotPassword"
                          type={showForgotPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-9 pr-9 h-10"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          title={showForgotPassword ? 'Masquer' : 'Afficher'}
                        >
                          {showForgotPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="forgotConfirmPassword" className="text-xs">Confirmer le mot de passe</Label>
                      <div className="relative mt-1.5">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgotConfirmPassword"
                          type="password"
                          placeholder="••••••••"
                          className="pl-9 h-10"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Compte vérifié : vous pouvez maintenant définir un nouveau mot de passe.
                      </p>
                    </div>

                    {forgotError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2 animate-in fade-in zoom-in-95 duration-200">
                        {forgotError}
                      </div>
                    )}

                    <Button type="submit" className="w-full h-10 shadow-soft-lg">
                      <KeyRound className="h-4 w-4 mr-2" /> Réinitialiser le mot de passe
                    </Button>
                  </form>
                )}
              </>
            )}

            {mode === 'register' && (
              <>
                <button type="button" onClick={() => { setRegError(''); setMode('login'); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
                </button>
                {renderHeader('Créer un compte',
                  regStep === 1 ? 'Quel type de compte souhaitez-vous créer ?' :
                  regStep === 2 ? 'Complétez vos informations.' :
                  'Vérifiez et validez votre inscription.')}

                {/* Stepper */}
                <div className="flex items-center gap-2 mb-6">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex-1">
                      <div className={cn('h-1.5 rounded-full transition-colors', s <= regStep ? 'bg-primary' : 'bg-muted')} />
                    </div>
                  ))}
                </div>

                {regDone ? (
                  <div className="text-center py-6">
                    <div className="mx-auto h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Compte créé</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      {regRole === 'client'
                        ? 'Votre compte client est immédiatement actif. Connectez-vous pour commencer.'
                        : 'Votre compte employé a été transmis à un administrateur. Vous pourrez vous connecter dès sa validation.'}
                    </p>
                    <Button className="w-full h-10" onClick={() => { setMode('login'); }}>
                      Se connecter
                    </Button>
                  </div>
                ) : (
                  <>
                    {regStep === 1 && (
                      <div className="space-y-3">
                        {registrationRoles.map((r) => (
                          <button
                            key={r.role}
                            type="button"
                            onClick={() => { setRegRole(r.role); setRegError(''); }}
                            className={cn(
                              'w-full text-left flex items-center gap-3 rounded-xl border p-3.5 transition-all duration-200',
                              regRole === r.role
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5'
                            )}
                          >
                            <div className="flex-shrink-0">
                              <r.icon className={cn('h-5 w-5', r.accent)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">{r.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                            </div>
                          </button>
                        ))}
                        {regError && (
                          <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2 animate-in fade-in zoom-in-95 duration-200">
                            {regError}
                          </div>
                        )}
                        <Button className="w-full h-10" onClick={() => goToStep(2)} disabled={!regRole}>
                          Continuer
                        </Button>
                      </div>
                    )}

                    {regStep === 2 && (
                      <form
                        className="space-y-4"
                        onSubmit={(e) => { e.preventDefault(); goToStep(3); }}
                      >
                        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3">
                          {regRole && (() => {
                            const r = registrationRoles.find((x) => x.role === regRole);
                            if (!r) return null;
                            return (
                              <>
                                <r.icon className={cn('h-5 w-5', r.accent)} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold">{r.label}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {r.role === 'client' ? 'Compte actif immédiatement' : 'Compte à valider par un administrateur'}
                                  </p>
                                </div>
                                <button type="button" onClick={() => setRegStep(1)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                                  Modifier
                                </button>
                              </>
                            );
                          })()}
                        </div>

                        <div>
                          <Label htmlFor="regName" className="text-xs">Nom complet</Label>
                          <div className="relative mt-1.5">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="regName" placeholder="Prénom Nom" className="pl-9 h-10" value={regName} onChange={(e) => setRegName(e.target.value)} />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="regEmail" className="text-xs">Email</Label>
                          <div className="relative mt-1.5">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="regEmail" type="email" placeholder="votre@email.com" className="pl-9 h-10" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="regPassword" className="text-xs">Mot de passe</Label>
                          <div className="relative mt-1.5">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="regPassword" type="password" placeholder="••••••••" className="pl-9 h-10" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="regConfirm" className="text-xs">Confirmer le mot de passe</Label>
                          <div className="relative mt-1.5">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="regConfirm" type="password" placeholder="••••••••" className="pl-9 h-10" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="regPhone" className="text-xs">Téléphone <span className="text-muted-foreground">(optionnel)</span></Label>
                          <div className="relative mt-1.5">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="regPhone" type="tel" placeholder="+33 6 12 34 56 78" className="pl-9 h-10" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
                          </div>
                        </div>

                        {regRole === 'client' && (
                          <div>
                            <Label htmlFor="regCompany" className="text-xs">Entreprise <span className="text-muted-foreground">(optionnel)</span></Label>
                            <div className="relative mt-1.5">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="regCompany" placeholder="Nom de votre entreprise" className="pl-9 h-10" value={regCompany} onChange={(e) => setRegCompany(e.target.value)} />
                            </div>
                          </div>
                        )}

                        {regRole === 'membre' && (
                          <div>
                            <Label className="text-xs">Spécialité</Label>
                            <div className="mt-1.5">
                              <Select value={regSpecialty || undefined} onValueChange={(v) => setRegSpecialty(v)}>
                                <SelectTrigger className="w-full h-10">
                                  <SelectValue placeholder="Choisir une spécialité" />
                                </SelectTrigger>
                                <SelectContent>
                                  {specialties.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {regError && (
                          <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2 animate-in fade-in zoom-in-95 duration-200">
                            {regError}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <Button type="button" variant="outline" className="h-10 w-fit px-4" onClick={() => setRegStep(1)}>
                            <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour
                          </Button>
                          <Button type="submit" className="flex-1 h-10">
                            Continuer
                          </Button>
                        </div>
                      </form>
                    )}

                    {regStep === 3 && (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-card divide-y divide-border">
                          <div className="flex items-center gap-2.5 p-3">
                            {regRole && (() => {
                              const r = registrationRoles.find((x) => x.role === regRole);
                              if (!r) return null;
                              return (
                                <>
                                  <r.icon className={cn('h-4 w-4', r.accent)} />
                                  <p className="text-sm font-medium flex-1">{r.label}</p>
                                  <RoleBadge role={regRole} />
                                </>
                              );
                            })()}
                          </div>
                          <div className="px-3 py-2.5 text-sm"><span className="text-muted-foreground">Nom :</span> <span className="font-medium">{regName}</span></div>
                          <div className="px-3 py-2.5 text-sm"><span className="text-muted-foreground">Email :</span> <span className="font-medium">{regEmail}</span></div>
                          {regPhone && <div className="px-3 py-2.5 text-sm"><span className="text-muted-foreground">Téléphone :</span> <span className="font-medium">{regPhone}</span></div>}
                          {regRole === 'client' && regCompany && <div className="px-3 py-2.5 text-sm"><span className="text-muted-foreground">Entreprise :</span> <span className="font-medium">{regCompany}</span></div>}
                          {regRole === 'membre' && <div className="px-3 py-2.5 text-sm"><span className="text-muted-foreground">Spécialité :</span> <span className="font-medium">{regSpecialty}</span></div>}
                        </div>

                        <div className={cn(
                          'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm',
                          regRole === 'client' ? 'border-success/30 bg-success/10 text-foreground' : 'border-warning/30 bg-warning/10 text-foreground'
                        )}>
                          {regRole === 'client'
                            ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                            : <UserPlus className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />}
                          <p className="text-sm">
                            {regRole === 'client'
                              ? 'Votre compte client sera actif immédiatement après validation de cette étape.'
                              : 'Votre compte employé devra être validé par un administrateur avant la première connexion.'}
                          </p>
                        </div>

                        {regError && (
                          <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2 animate-in fade-in zoom-in-95 duration-200">
                            {regError}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <Button type="button" variant="outline" className="h-10 w-fit px-4" onClick={() => setRegStep(2)}>
                            <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour
                          </Button>
                          <Button className="flex-1 h-10" onClick={submitRegistration}>
                            <UserPlus className="h-4 w-4 mr-2" /> Créer mon compte
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}