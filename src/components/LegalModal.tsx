import React from 'react';
import { APP_VERSION_NAME } from '../lib/constants';

interface Props {
  title: string;
  type: 'privacy' | 'terms';
  onClose: () => void;
}

const LegalModal: React.FC<Props> = ({ title, type, onClose }) => {
  return (
    <div className="fixed inset-0 bg-[var(--neu-bg)] text-slate-900 dark:text-white z-[60] flex flex-col animate-in fade-in duration-200">
      <header className="p-5 border-b border-slate-200/50 dark:border-slate-800/60 flex justify-between items-center bg-[var(--neu-surface)]">
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h2>
        <button 
          onClick={onClose} 
          aria-label="Close modal"
          className="neu-btn p-2.5 rounded-2xl text-slate-600 dark:text-slate-300 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed space-y-6">
        {type === 'privacy' ? (
          <>
            <p className="text-slate-500 dark:text-slate-400 text-xs italic">
              Effective Date: September 9, 2026 &bull; Version {APP_VERSION_NAME}
            </p>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">1. Introduction</h3>
              <p>
                BunkCalc (&quot;the App&quot;, &quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is an attendance-tracking application developed by{' '}
                <a href="https://github.com/PinecoXZ" target="_blank" rel="noopener noreferrer" className="text-blue-500 font-bold underline">
                  PinecoXZ
                </a>. This Privacy Policy describes how the App handles information when you use BunkCalc on your personal device or on the web. By using BunkCalc, you acknowledge and agree to this policy.
              </p>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">2. Our Privacy Commitment: Zero Data Collection</h3>
              <p>
                BunkCalc is designed with a <span className="text-slate-900 dark:text-white font-bold">local-first, zero-telemetry architecture</span>. All your data — including subjects, attendance history, past session counts, holiday managers, and notification preferences — is stored exclusively on your device using encrypted native storage (SharedPreferences / Preferences). We operate zero backend tracking servers, databases, or analytics engines.
              </p>
              <p className="mt-2 text-slate-900 dark:text-white font-bold italic">
                In simple terms: your data never leaves your phone.
              </p>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">3. Information We Do Not Collect</h3>
              <p>BunkCalc does <span className="font-bold text-slate-900 dark:text-white">not</span> collect, store remotely, track, or share:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Personally Identifiable Information (Name, student ID, roll number, phone, email)</li>
                <li>Location, GPS coordinates, or IP addresses</li>
                <li>Device identifiers (IMEI, Advertising ID, serial numbers)</li>
                <li>Biometric templates, fingerprint scans, or facial recognition geometry</li>
                <li>Behavioral analytics, tracking pixels, or third-party cookies</li>
                <li>Crash telemetry or background usage telemetry</li>
                <li>Contacts, photos, microphone, or external files</li>
              </ul>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">4. Device Permissions Explained</h3>
              <div className="space-y-3 mt-3">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1">
                    Biometric Authentication (Fingerprint / Face Unlock)
                  </p>
                  <p className="text-xs">
                    Executed exclusively via Android&apos;s native BiometricPrompt API within the device&apos;s Secure Element (TEE). BunkCalc never accesses, inspects, or transmits biometric geometry.
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1">
                    Local Notifications
                  </p>
                  <p className="text-xs">
                    Class reminders, post-lecture prompts, and threshold alerts are scheduled directly into Android AlarmManager. No external push tokens or remote servers are employed.
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1">
                    Cache &amp; Storage Access
                  </p>
                  <p className="text-xs">
                    Accessed only when you manually trigger JSON backup exports, calendar .ics exports, or attendance card generation. All written files remain in app-specific sandbox cache.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">5. Meme Roast Mode &amp; Sarcastic Notifications</h3>
              <p>
                BunkCalc offers an optional Meme Roast Mode providing humorous college notifications and attendance marking reactions. All meme phrases and roasts are static local strings evaluated on-device. No user input or habits are sent over the network to generate humor, and all faculty references strictly and generically refer to &quot;the professor&quot; without collecting or referencing specific instructor identities.
              </p>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">6. Semester Attendance Wrapped &amp; Share Cards</h3>
              <p>
                Attendance cards (such as the Meme Wrapped card) are rendered on-device using client-side Canvas APIs. Images exist solely in temporary volatile device memory and are passed to native Android sharing sheets only when you explicitly tap share. BunkCalc maintains zero image hosting or tracking servers.
              </p>
            </section>

            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">7. Data Retention &amp; Permanent Deletion</h3>
              <p>
                Because no records exist on our servers, you retain absolute data sovereignty:
              </p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Tap <span className="font-bold text-slate-900 dark:text-white">Reset App</span> in Settings to purge all local records immediately.</li>
                <li>Clear application storage in Android System Settings.</li>
                <li>Uninstalling BunkCalc irreversibly deletes all stored logs from the device.</li>
              </ul>
            </section>
          </>
        ) : (
          <>
            <p className="text-slate-500 dark:text-slate-400 text-xs italic">
              Effective Date: September 9, 2026 &bull; Version {APP_VERSION_NAME}
            </p>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">1. Acceptance of Terms</h3>
              <p>
                By using BunkCalc (&quot;the App&quot;) developed by{' '}
                <a href="https://github.com/PinecoXZ" target="_blank" rel="noopener noreferrer" className="text-blue-500 font-bold underline">
                  PinecoXZ
                </a>, you agree to be bound by these Terms of Service. If you do not agree to these Terms, you must not use the App.
              </p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">2. Description of Service</h3>
              <p>
                BunkCalc is a personal attendance estimation and schedule tracking tool designed for university and college students. Features include 1-tap quick marking, Safe Bunk Budget computations, Biometric/PIN security, timetable QR sharing, custom subject thresholds, holiday managers, Meme Roast mode, and Semester Attendance Wrapped generation.
              </p>
            </section>

            <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
              <h3 className="text-red-600 dark:text-red-400 font-bold text-lg mb-2">
                3. Critical Academic Responsibility &amp; Debarment Disclaimer
              </h3>
              <p className="font-bold text-slate-900 dark:text-white text-xs uppercase mb-2">
                BUNKCALC IS NOT AN OFFICIAL UNIVERSITY REGISTRAR OR ERP PORTAL.
              </p>
              <ul className="list-disc ml-5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <li>
                  You, as a student, are solely and individually responsible for fulfilling all statutory attendance requirements mandated by your university, college, UGC, or AICTE (including 75% or 85% cutoffs).
                </li>
                <li>
                  BunkCalc computes mathematical estimates based strictly on manual user inputs. Discrepancies may arise due to professor overrides, unnotified extra classes, administrative corrections, or official portal calculation rules.
                </li>
                <li>
                  In no event shall BunkCalc or its developer be liable for any academic penalties, examination debarments, loss of hall tickets, grade reductions, or disciplinary hearings. Always cross-verify your official college ERP before deciding to skip classes.
                </li>
              </ul>
            </section>

            <section className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
              <h3 className="text-purple-600 dark:text-purple-400 font-bold text-base mb-1">
                4. Satirical Content &amp; Meme Roasts Disclaimer
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                The &quot;Meme Roast Mode&quot;, student tier badges (&quot;Academic Weapon&quot;, &quot;Debarred Final Boss&quot;), and humorous notifications are satirical student humor designed for motivation and entertainment. They do not constitute actual academic warnings, institutional sanctions, or real-world disciplinary notices. All characterizations refer strictly and generically to &quot;the professor&quot; with zero reference to any specific individual faculty member.
              </p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">5. Disclaimer of Warranties</h3>
              <p className="uppercase text-xs font-mono font-bold">
                THE APP IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT CALCULATIONS WILL BE ERROR-FREE OR ACCREDITED BY ANY INSTITUTION.
              </p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">6. Limitation of Liability</h3>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL BUNKCALC OR ITS DEVELOPER BE LIABLE FOR ANY ACADEMIC PENALTIES, DEBARMENT, LOSS OF CREDITS, DATA LOSS RESULTING FROM DEVICE RECOVERY ISSUES, OR ANY CONSEQUENTIAL DAMAGES. YOUR USE OF BUNKCALC IS ENTIRELY AT YOUR OWN RISK.
              </p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">7. User Responsibilities</h3>
              <ul className="list-disc ml-5 space-y-1">
                <li>Input accurate schedules and attendance records for dependable calculations.</li>
                <li>Regularly export JSON backups if you wish to preserve your semester journal across phone resets.</li>
                <li>Cross-verify attendance with your college&apos;s official portal before making academic decisions.</li>
                <li>Use the app in compliance with institutional honor codes.</li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">8. Intellectual Property</h3>
              <p>
                The BunkCalc name, logo, iconography, UI layouts, and brand assets are the intellectual property of BunkCalc and its creator PinecoXZ.
              </p>
            </section>
            
            <section>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">9. Governing Law</h3>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India, subject to the exclusive jurisdiction of the courts in Bhubaneswar, Odisha, India.
              </p>
            </section>
          </>
        )}
        <div className="pt-8 pb-6 text-center text-slate-400 dark:text-slate-500 text-xs font-mono">
          Last Updated: September 9, 2026 &bull; BunkCalc v{APP_VERSION_NAME} &bull;{' '}
          <a href="https://github.com/PinecoXZ" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            PinecoXZ
          </a>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
