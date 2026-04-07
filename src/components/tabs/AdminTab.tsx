import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebaseUtils';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';
import { Loader2, Trash2, UserPlus, Shield, Search } from 'lucide-react';

export default function AdminTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newSenaraiPassword, setNewSenaraiPassword] = useState('123456');
  const [newCarianPassword, setNewCarianPassword] = useState('123456');
  const [newRosterPassword, setNewRosterPassword] = useState('123456');
  const [newRole, setNewRole] = useState('user');
  const [newDistrict, setNewDistrict] = useState('d1');
  const [newCanSearch, setNewCanSearch] = useState(false);
  const [newCanAccessRoster, setNewCanAccessRoster] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  
  const [isChangingPasswords, setIsChangingPasswords] = useState<any | null>(null);
  const [editLoginPass, setEditLoginPass] = useState('');
  const [editSenaraiPass, setEditSenaraiPass] = useState('');
  const [editCarianPass, setEditCarianPass] = useState('');
  const [editRosterPass, setEditRosterPass] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);

  const [isChangingOwnAuth, setIsChangingOwnAuth] = useState(false);
  const [newAuthPass, setNewAuthPass] = useState('');
  const [authPassLoading, setAuthPassLoading] = useState(false);

  const [passcode, setPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeLoading, setPasscodeLoading] = useState(false);

  const [isAddUserUnlocked, setIsAddUserUnlocked] = useState(false);
  const [addUserPasscodeInput, setAddUserPasscodeInput] = useState('');
  const [addUserPasscodeError, setAddUserPasscodeError] = useState(false);

  const handleUnlockAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (addUserPasscodeInput === passcode) {
      setIsAddUserUnlocked(true);
      setAddUserPasscodeError(false);
    } else {
      setAddUserPasscodeError(true);
      setAddUserPasscodeInput('');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers: any[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() });
      });
      setUsers(fetchedUsers);

      // Fetch global config for passcode
      const configDoc = await getDoc(doc(db, 'config', 'system'));
      if (configDoc.exists()) {
        setPasscode(configDoc.data().passcode || '123456');
      } else {
        // Create default if not exists
        await setDoc(doc(db, 'config', 'system'), { passcode: '123456' });
        setPasscode('123456');
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'users/config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdatePasscode = async () => {
    if (!newPasscode) return;
    setPasscodeLoading(true);
    try {
      await setDoc(doc(db, 'config', 'system'), { passcode: newPasscode });
      setPasscode(newPasscode);
      setNewPasscode('');
      alert('Passcode sistem berjaya dikemaskini!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/system');
    } finally {
      setPasscodeLoading(false);
    }
  };

  const handleUpdatePasswords = async () => {
    if (!isChangingPasswords) return;
    if (editLoginPass.length < 6) {
      alert('Kata laluan login mestilah sekurang-kurangnya 6 aksara.');
      return;
    }
    
    setChangeLoading(true);
    try {
      await updateDoc(doc(db, 'users', isChangingPasswords.id), {
        loginPassword: editLoginPass,
        senaraiPassword: editSenaraiPass,
        carianPassword: editCarianPass,
        rosterPassword: editRosterPass
      });
      
      setUsers(users.map(u => u.id === isChangingPasswords.id ? { 
        ...u, 
        loginPassword: editLoginPass,
        senaraiPassword: editSenaraiPass,
        carianPassword: editCarianPass,
        rosterPassword: editRosterPass
      } : u));
      
      let msg = `Rekod kata laluan untuk "${isChangingPasswords.username}" berjaya dikemaskini dalam pangkalan data!`;
      
      if (isChangingPasswords.id === auth.currentUser?.uid) {
        msg += `\n\n⚠️ NOTA: Ini HANYA menukar rekod paparan. Untuk menukar kata laluan LOGIN anda yang sebenar, sila gunakan bahagian "Tukar Kata Laluan Login Anda" di atas.`;
      } else {
        msg += `\n\n⚠️ PENTING: Ini TIDAK menukar kata laluan LOGIN sebenar pengguna ini. Anda perlu melakukannya di Firebase Console > Authentication.`;
      }
      
      alert(msg);
      setIsChangingPasswords(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${isChangingPasswords.id}`);
    } finally {
      setChangeLoading(false);
    }
  };

  const handleUpdateOwnAuthPassword = async () => {
    if (!newAuthPass || newAuthPass.length < 6) {
      alert('Kata laluan baru mestilah sekurang-kurangnya 6 aksara.');
      return;
    }
    
    setAuthPassLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newAuthPass);
        
        // Also update the display password in Firestore for consistency
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          loginPassword: newAuthPass
        });
        
        // Update local state
        setUsers(users.map(u => u.id === auth.currentUser?.uid ? { ...u, loginPassword: newAuthPass } : u));
        
        alert('Kata laluan LOGIN anda berjaya dikemaskini dalam Firebase Auth!');
        setIsChangingOwnAuth(false);
        setNewAuthPass('');
      }
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        alert('Sila log keluar dan log masuk semula untuk menukar kata laluan anda (keperluan keselamatan Firebase).');
      } else {
        alert(`Ralat: ${err.message}`);
      }
    } finally {
      setAuthPassLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      setAddError('Sila masukkan nama pengguna dan kata laluan.');
      return;
    }
    
    setAddLoading(true);
    setAddError('');
    setAddSuccess('');
    
    try {
      // Use a secondary Firebase app to create the user without signing out the admin
      const appName = `SecondaryApp_${Date.now()}`;
      const secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const email = `${newUsername.trim().toLowerCase()}@sspdrm.local`;
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newPassword);
      
      const userData = {
        username: newUsername.trim().toLowerCase(),
        role: newRole,
        district: newRole === 'admin' ? '' : newDistrict,
        canSearch: newCanSearch,
        canAccessRoster: newCanAccessRoster,
        loginPassword: newPassword,
        senaraiPassword: newSenaraiPassword,
        carianPassword: newCarianPassword,
        rosterPassword: newRosterPassword,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      
      // Clean up secondary app
      await deleteApp(secondaryApp);
      
      setAddSuccess(`Pengguna ${newUsername} berjaya ditambah!`);
      setNewUsername('');
      setNewPassword('');
      setNewSenaraiPassword('123456');
      setNewCarianPassword('123456');
      setNewRosterPassword('123456');
      setNewRole('user');
      setNewDistrict('d1');
      setNewCanSearch(false);
      setNewCanAccessRoster(false);
      setIsAddingUser(false);
      setIsAddUserUnlocked(false);
      setAddUserPasscodeInput('');
      fetchUsers();
    } catch (err: any) {
      console.error("Error adding user:", err);
      if (err.code === 'auth/email-already-in-use') {
        setAddError(`❌ Nama pengguna "${newUsername}" sudah wujud dalam sistem Authentication. Sila gunakan nama lain atau padam pengguna lama di Firebase Console.`);
      } else if (err.message && err.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(err, OperationType.CREATE, 'users');
      } else {
        setAddError(`❌ Gagal menambah pengguna: ${err.message || err.code}`);
      }
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Adakah anda pasti mahu memadam pengguna "${username}"?\n\nNota: Untuk memadam sepenuhnya (dan membolehkan nama pengguna ini digunakan semula), anda juga perlu memadamnya di Firebase Console > Authentication.`)) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      fetchUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  const toggleCanSearch = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        canSearch: !currentStatus
      });
      setUsers(users.map(u => u.id === userId ? { ...u, canSearch: !currentStatus } : u));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const toggleCanAccessRoster = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        canAccessRoster: !currentStatus
      });
      setUsers(users.map(u => u.id === userId ? { ...u, canAccessRoster: !currentStatus } : u));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-[#001f5c] to-[#0a3fa8] rounded-2xl p-4 md:p-6 flex items-center justify-between mb-5 text-white shadow-md">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="text-3xl md:text-4xl">⚙️</div>
          <div>
            <div className="font-bold text-xl md:text-2xl text-yellow-400 tracking-wide">Tetapan Pentadbir</div>
            <div className="text-[13px] text-white/70 mt-0.5">Urus pengguna dan kebenaran sistem</div>
          </div>
        </div>
        <button 
          onClick={() => {
            if (isAddingUser) {
              setIsAddingUser(false);
              setIsAddUserUnlocked(false);
              setAddUserPasscodeInput('');
            } else {
              setIsAddingUser(true);
            }
          }}
          className="bg-yellow-400 text-[#001f5c] hover:bg-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <UserPlus size={16} />
          {isAddingUser ? 'Batal' : 'Tambah Pengguna'}
        </button>
      </div>

      {isAddingUser && !isAddUserUnlocked && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 mb-5 shadow-sm max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-[#003087]" size={32} />
          </div>
          <h3 className="font-bold text-lg text-[#003087] mb-2">Akses Disekat</h3>
          <p className="text-sm text-slate-500 mb-6">Sila masukkan Passcode Sistem untuk menambah pengguna baru.</p>
          
          <form onSubmit={handleUnlockAddUser}>
            <input 
              type="password" 
              value={addUserPasscodeInput}
              onChange={e => setAddUserPasscodeInput(e.target.value)}
              className={`w-full border-2 rounded-lg p-3 text-center text-lg tracking-widest font-bold outline-none mb-4 transition-colors ${
                addUserPasscodeError ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 focus:border-[#003087]'
              }`}
              placeholder="••••••"
              autoFocus
            />
            {addUserPasscodeError && (
              <div className="text-red-500 text-xs font-bold mb-4">Passcode tidak sah. Sila cuba lagi.</div>
            )}
            <button 
              type="submit"
              className="w-full bg-gradient-to-br from-[#001f5c] to-[#0a3fa8] text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Buka Kunci
            </button>
          </form>
        </div>
      )}

      {isAddingUser && isAddUserUnlocked && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">
          <h3 className="font-bold text-lg text-[#003087] mb-4 border-b border-slate-100 pb-2">Tambah Pengguna Baru</h3>
          
          {addError && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{addError}</div>}
          {addSuccess && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">{addSuccess}</div>}
          
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            {/* Left Column: Identity & Role */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Pengguna</label>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#003087]"
                  placeholder="cth: d1_admin"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peranan</label>
                <select 
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#003087] bg-white"
                >
                  <option value="user">Pengguna Biasa (Daerah)</option>
                  <option value="admin">Pentadbir (Admin)</option>
                </select>
              </div>
              
              {newRole === 'user' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Daerah</label>
                  <select 
                    value={newDistrict}
                    onChange={e => setNewDistrict(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#003087] bg-white"
                  >
                    <option value="d1">Melaka Tengah (d1)</option>
                    <option value="d2">Jasin (d2)</option>
                    <option value="d3">Alor Gajah (d3)</option>
                    <option value="d4">IPK SSPDRM (d4)</option>
                    <option value="all">Semua Daerah</option>
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newCanSearch}
                    onChange={e => setNewCanSearch(e.target.checked)}
                    className="w-4 h-4 text-[#003087] rounded border-slate-300 focus:ring-[#003087]"
                  />
                  <span className="text-sm font-semibold text-slate-700">Benarkan akses ke tab "Main Hour"</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newCanAccessRoster}
                    onChange={e => setNewCanAccessRoster(e.target.checked)}
                    className="w-4 h-4 text-[#003087] rounded border-slate-300 focus:ring-[#003087]"
                  />
                  <span className="text-sm font-semibold text-slate-700">Benarkan akses ke tab "Roster"</span>
                </label>
              </div>
            </div>

            {/* Right Column: Passwords */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tetapan Kata Laluan</h4>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kata Laluan Masuk Sistem</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#003087] bg-white"
                  placeholder="Minimum 6 aksara"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Carian</label>
                <input 
                  type="text" 
                  value={newSenaraiPassword}
                  onChange={e => setNewSenaraiPassword(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#003087] bg-white"
                  placeholder="Passcode Carian"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mainhour</label>
                <input 
                  type="text" 
                  value={newCarianPassword}
                  onChange={e => setNewCarianPassword(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#003087] bg-white"
                  placeholder="Passcode Mainhour"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Roster</label>
                <input 
                  type="text" 
                  value={newRosterPassword}
                  onChange={e => setNewRosterPassword(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#003087] bg-white"
                  placeholder="Passcode Roster"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-slate-100">
              <button 
                type="submit"
                disabled={addLoading}
                className="w-full md:w-auto bg-[#003087] text-white px-10 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-800 disabled:opacity-70 shadow-sm transition-all"
              >
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus size={16} />}
                {addLoading ? 'Menyimpan...' : 'Simpan Pengguna Baru'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-[#003087]">Tukar Kata Laluan Login Anda</h3>
          <button 
            onClick={() => setIsChangingOwnAuth(!isChangingOwnAuth)}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            {isChangingOwnAuth ? 'Batal' : 'Tukar Sekarang'}
          </button>
        </div>
        
        {isChangingOwnAuth && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-in slide-in-from-top-2">
            <p className="text-xs text-blue-700 mb-3 font-medium">
              ⚠️ Tindakan ini akan menukar kata laluan LOGIN anda dalam sistem Firebase Authentication.
            </p>
            <div className="flex flex-col md:flex-row gap-3">
              <input 
                type="password" 
                value={newAuthPass}
                onChange={e => setNewAuthPass(e.target.value)}
                className="flex-1 border-2 border-blue-200 rounded-lg p-2 text-sm outline-none focus:border-[#003087]"
                placeholder="Kata laluan baru (min 6 aksara)"
              />
              <button 
                onClick={handleUpdateOwnAuthPassword}
                disabled={authPassLoading}
                className="bg-[#003087] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {authPassLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield size={16} />}
                {authPassLoading ? 'Mengemaskini...' : 'Kemaskini Kata Laluan'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 md:p-5 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="font-bold text-lg text-slate-900">Login/Senaraicarian/Mainhour/Roster Pengguna Sistem</div>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-50 border border-yellow-200 p-2 px-3 rounded-lg flex items-center gap-3">
              <div className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Passcode Sistem: <span className="text-sm font-mono">{passcode}</span></div>
              <div className="flex items-center gap-1">
                <input 
                  type="text" 
                  placeholder="Passcode baru"
                  value={newPasscode}
                  onChange={e => setNewPasscode(e.target.value)}
                  className="w-24 p-1 text-xs border border-yellow-300 rounded outline-none focus:border-yellow-500"
                />
                <button 
                  onClick={handleUpdatePasscode}
                  disabled={passcodeLoading}
                  className="bg-yellow-500 text-white p-1 px-2 rounded text-[10px] font-bold hover:bg-yellow-600 disabled:opacity-50"
                >
                  {passcodeLoading ? '...' : 'KEMASKINI'}
                </button>
              </div>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              💡 <strong>Nota:</strong> Kata laluan ditetapkan semasa menambah pengguna.
            </div>
          </div>
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-slate-50 border-y-2 border-slate-200">
                <th className="p-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Pengguna</th>
                <th className="p-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Peranan</th>
                <th className="p-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Daerah</th>
                <th className="p-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Akses Tab</th>
                <th className="p-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Login/Senaraicarian/Mainhour/Roster</th>
                <th className="p-3 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center p-8 text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="text-center p-8 text-red-500">{error}</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-slate-500">Tiada pengguna ditemui.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-3 px-4 font-bold text-slate-800">{u.username}</td>
                    <td className="p-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {u.role === 'admin' ? <Shield size={12} /> : null}
                        {u.role === 'admin' ? 'Admin' : 'Pengguna'}
                      </span>
                    </td>
                    <td className="p-3 px-4 font-semibold text-slate-600">
                      {u.role === 'admin' ? 'Semua Daerah' : (u.district || '—').toUpperCase()}
                    </td>
                    <td className="p-3 px-4">
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => toggleCanSearch(u.id, u.canSearch)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded text-left flex items-center justify-between ${u.canSearch ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                        >
                          Main Hour {u.canSearch ? '✅' : '❌'}
                        </button>
                        <button 
                          onClick={() => toggleCanAccessRoster(u.id, u.canAccessRoster)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded text-left flex items-center justify-between ${u.canAccessRoster ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                        >
                          Roster {u.canAccessRoster ? '✅' : '❌'}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 uppercase font-bold">Login:</span>
                          <span className="font-mono bg-slate-100 px-1 rounded">{u.loginPassword || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 uppercase font-bold">Carian:</span>
                          <span className="font-mono bg-slate-100 px-1 rounded">{u.senaraiPassword || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 uppercase font-bold">Mainhour:</span>
                          <span className="font-mono bg-slate-100 px-1 rounded">{u.carianPassword || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 uppercase font-bold">Roster:</span>
                          <span className="font-mono bg-slate-100 px-1 rounded">{u.rosterPassword || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setIsChangingPasswords(u);
                            setEditLoginPass(u.loginPassword || '');
                            setEditSenaraiPass(u.senaraiPassword || '');
                            setEditCarianPass(u.carianPassword || '');
                            setEditRosterPass(u.rosterPassword || '');
                          }}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded transition-colors"
                          title="Tukar Kata Laluan"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          disabled={u.username === 'admin'}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title={u.username === 'admin' ? 'Admin utama tidak boleh dipadam' : 'Padam Pengguna'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isChangingPasswords && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-lg text-slate-900 mb-2">Kemaskini Rekod Kata Laluan</h3>
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4">
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <strong>⚠️ PERHATIAN:</strong> Menukar "Kata Laluan Masuk Sistem" di sini <strong>HANYA</strong> mengemaskini rekod paparan dalam pangkalan data. Ia <strong>TIDAK</strong> akan menukar kata laluan yang digunakan semasa log masuk (Firebase Auth).
              </p>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Mengemaskini rekod untuk pengguna <strong>{isChangingPasswords.username}</strong>.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rekod Kata Laluan Masuk (Bukan Login Sebenar)</label>
                <input 
                  type="text" 
                  value={editLoginPass}
                  onChange={e => setEditLoginPass(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#003087]"
                  placeholder="Login Password Record"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Carian</label>
                <input 
                  type="text" 
                  value={editSenaraiPass}
                  onChange={e => setEditSenaraiPass(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#003087]"
                  placeholder="Carian Passcode"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mainhour</label>
                <input 
                  type="text" 
                  value={editCarianPass}
                  onChange={e => setEditCarianPass(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#003087]"
                  placeholder="Mainhour Passcode"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Roster</label>
                <input 
                  type="text" 
                  value={editRosterPass}
                  onChange={e => setEditRosterPass(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#003087]"
                  placeholder="Roster Passcode"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setIsChangingPasswords(null)}
                className="flex-1 border-2 border-slate-200 text-slate-600 p-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                BATAL
              </button>
              <button 
                onClick={handleUpdatePasswords}
                disabled={changeLoading}
                className="flex-1 bg-[#003087] text-white p-2.5 rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors disabled:opacity-70"
              >
                {changeLoading ? '...' : 'SIMPAN SEMUA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
