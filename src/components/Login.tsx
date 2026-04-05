import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { logoBase64 } from '../assets/logoBase64';

export default function Login({ onLogin }: { onLogin: (user: any, token: string, logId: string) => void }) {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const recordLogin = async (userData: any) => {
    try {
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const docRef = await addDoc(collection(db, 'logs'), {
        username: userData.username,
        role: userData.role,
        tab: 'today',
        loginDate: dateStr,
        loginTime: timeStr,
        logoutTime: '—'
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'logs');
      return '';
    }
  };

  const doLogin = async () => {
    if (!username || !token) {
      setError('Sila masukkan nama pengguna dan token.');
      return;
    }
    setLoading(true);
    setError('');
    setStatusMsg('Mengesahkan...');

    const email = `${username.trim().toLowerCase()}@sspdrm.local`;

    try {
      // Cuba log masuk
      const userCredential = await signInWithEmailAndPassword(auth, email, token);
      
      // Dapatkan data pengguna dari Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const logId = await recordLogin(userData);
        onLogin(userData, token, logId);
      } else {
        const uName = username.toLowerCase();
        if (uName === 'admin' || uName === 'admin_kecemasan') {
          // Hanya cipta semula dokumen untuk admin/kecemasan bagi mengelakkan lockout
          const userData = { username: uName, role: 'admin', district: '' };
          await setDoc(doc(db, 'users', userCredential.user.uid), userData);
          const logId = await recordLogin(userData);
          onLogin(userData, token, logId);
        } else {
          // Log keluar pengguna kerana dokumen mereka telah dipadam oleh admin
          await auth.signOut();
          setError('❌ Akaun anda telah dipadam atau dinyahaktifkan oleh Pentadbir.');
        }
      }
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials') {
        const allowedUsers: Record<string, string> = {
          'admin': 'admin123',
          'd1': 'd1pass',
          'd2': 'd2pass',
          'd3': 'd3pass',
          'd4': 'd4pass'
        };

        const uName = username.toLowerCase();
        
        // EMERGENCY BACKDOOR: Allow admin_emergency to bypass and create a temporary admin
        if (uName === 'admin_emergency' && token === 'pdrm2026') {
          try {
            setStatusMsg('Mengaktifkan mod kecemasan...');
            const userCredential = await createUserWithEmailAndPassword(auth, email, token);
            const userData = { username: 'admin_emergency', role: 'admin', district: '' };
            await setDoc(doc(db, 'users', userCredential.user.uid), userData);
            const logId = await recordLogin(userData);
            onLogin(userData, token, logId);
            return;
          } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
              try {
                const userCredential = await signInWithEmailAndPassword(auth, email, token);
                const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
                const userData = userDoc.exists() ? userDoc.data() : { username: 'admin_emergency', role: 'admin', district: '' };
                const logId = await recordLogin(userData);
                onLogin(userData, token, logId);
                return;
              } catch (signInErr: any) {
                setError(`❌ Ralat kecemasan: ${signInErr.code}`);
                return;
              }
            } else {
              setError(`❌ Ralat kecemasan: ${err.code}`);
              return;
            }
          }
        }

        if (allowedUsers[uName] && token === allowedUsers[uName]) {
          try {
            setStatusMsg('Mendaftar pengguna awal...');
            const userCredential = await createUserWithEmailAndPassword(auth, email, token);
            const defaultRole = uName === 'admin' ? 'admin' : 'user';
            const defaultDistrict = uName === 'admin' ? '' : uName;
            const userData = { username: uName, role: defaultRole, district: defaultDistrict };
            await setDoc(doc(db, 'users', userCredential.user.uid), userData);
            const logId = await recordLogin(userData);
            onLogin(userData, token, logId);
            return;
          } catch (createErr: any) {
            if (createErr.code === 'auth/operation-not-allowed') {
              setError('❌ Sila aktifkan "Email/Password" di Firebase Console > Authentication > Sign-in method.');
            } else if (createErr.code === 'auth/email-already-in-use') {
              if (uName === 'admin') {
                setError(`❌ Kata laluan salah untuk Admin. Jika anda baru menukar kata laluan di 'Tetapan Admin', ia mungkin hanya menukar rekod pangkalan data, bukan kata laluan log masuk sebenar. Sila guna kata laluan lama atau guna akaun kecemasan (admin_emergency) untuk masuk dan betulkan.`);
              } else {
                setError('❌ Kata laluan salah.');
              }
            } else {
              handleFirestoreError(createErr, OperationType.CREATE, 'users');
            }
          }
        } else {
          setError('❌ Nama pengguna atau token tidak sah.');
        }
      } else if (e.code === 'auth/operation-not-allowed') {
        setError('❌ Sila aktifkan "Email/Password" di Firebase Console > Authentication > Sign-in method.');
      } else if (e.message && e.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(e, OperationType.GET, 'users');
      } else {
        if (username.toLowerCase() === 'admin') {
          setError(`❌ Kata laluan salah untuk Admin. Jika anda baru menukar kata laluan di 'Tetapan Admin', ia mungkin hanya menukar rekod pangkalan data, bukan kata laluan log masuk sebenar. Sila guna kata laluan lama atau guna akaun kecemasan (admin_emergency) untuk masuk dan betulkan.`);
        } else {
          setError(`❌ Ralat log masuk: ${e.message || e.code || 'Sila cuba lagi.'}`);
        }
      }
      setToken('');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#001f5c] via-[#0a3fa8] to-blue-700 fixed inset-0 z-50">
      <div className="bg-white rounded-2xl p-10 w-full max-w-md shadow-2xl text-center">
        <div className="mb-4 flex items-center justify-center">
          <img 
            src={logoBase64} 
            alt="PDRM Logo" 
            className="w-28 h-28 object-contain drop-shadow-lg"
          />
        </div>
        <div className="font-bold text-2xl text-[#003087] tracking-wider mb-1">SSPDRM MELAKA</div>
        <div className="text-xs text-slate-500 mb-7 tracking-widest uppercase">Sistem Penugasan Anggota SSPDRM</div>
        
        <div className="mb-4 text-left">
          <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">Nama Pengguna</label>
          <input 
            type="text" 
            className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#003087] transition-colors"
            placeholder="Masukkan nama pengguna..."
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
          />
        </div>
        <div className="mb-4 text-left">
          <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">Token (Kata Laluan)</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              className="w-full border-2 border-slate-200 rounded-lg p-3 pr-10 text-sm outline-none focus:border-[#003087] transition-colors"
              placeholder="Masukkan token anda..."
              value={token}
              onChange={e => setToken(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <button 
          className="w-full bg-gradient-to-br from-[#001f5c] to-[#0a3fa8] text-white border-none rounded-lg p-3 text-sm font-bold cursor-pointer mt-2 tracking-wider transition-opacity hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2"
          onClick={doLogin}
          disabled={loading}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {statusMsg}</> : 'LOG MASUK'}
        </button>
        
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-sm mt-3">{error}</div>}
        
        <hr className="border-t border-slate-200 my-5" />
        <div className="text-xs text-slate-500 leading-relaxed">
          Polis Diraja Malaysia · SSPDRM Melaka<br/>
          Gunakan token yang diberikan oleh pentadbir.
        </div>
      </div>
    </div>
  );
}
