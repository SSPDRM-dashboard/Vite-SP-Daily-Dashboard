/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firebaseUtils';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('dashUser');
    const savedToken = sessionStorage.getItem('dashToken');
    const savedLogId = sessionStorage.getItem('dashLogId');
    if (savedUser && savedToken) {
      setCurrentUser(JSON.parse(savedUser));
      setCurrentToken(savedToken);
      setCurrentLogId(savedLogId);
    }
  }, []);

  // Auto logout after 2 hours of inactivity
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId: any;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
      }, 7200000); // 2 hours
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [currentUser]);

  // Update logout time on window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentLogId) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        // Use navigator.sendBeacon or a synchronous call if possible, 
        // but Firestore update is async. We'll try our best.
        updateDoc(doc(db, 'logs', currentLogId), {
          logoutTime: timeStr
        }).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentLogId]);

  const handleLogin = async (user: any, token: string, logId: string) => {
    setCurrentUser(user);
    setCurrentToken(token);
    setCurrentLogId(logId);
    sessionStorage.setItem('dashUser', JSON.stringify(user));
    sessionStorage.setItem('dashToken', token);
    sessionStorage.setItem('dashLogId', logId);
  };

  const handleUserUpdate = (updatedUser: any) => {
    setCurrentUser(updatedUser);
    sessionStorage.setItem('dashUser', JSON.stringify(updatedUser));
  };

  const handleLogout = async () => {
    if (currentLogId) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      try {
        await updateDoc(doc(db, 'logs', currentLogId), {
          logoutTime: timeStr
        });
      } catch (e) {
        console.error("Error updating logout time:", e);
      }
    }
    sessionStorage.removeItem('dashUser');
    sessionStorage.removeItem('dashToken');
    sessionStorage.removeItem('dashLogId');
    setCurrentUser(null);
    setCurrentToken(null);
    setCurrentLogId(null);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Dashboard
      currentUser={currentUser}
      currentToken={currentToken!}
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
    />
  );
}
