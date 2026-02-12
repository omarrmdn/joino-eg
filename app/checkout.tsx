import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Colors } from '../src/constants/Colors';
import { useAlert } from '../src/lib/AlertContext';
import { notificationManager } from '../src/lib/NotificationManager';
import { useSupabaseClient } from '../src/lib/supabaseConfig';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const params = useLocalSearchParams();
  const { showToast } = useAlert();
  const webViewRef = useRef<WebView>(null);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Ensure cost is formatted correctly (2 decimal places)
  const rawCost = params.cost ? Number(params.cost) : 0.00;
  const cost = rawCost.toFixed(2);
  const currency = params.currency ? String(params.currency) : "EGP";
  const eventId = params.eventId ? String(params.eventId) : null;

  const completeJoin = async () => {
    if (!user || !eventId) {
      showToast({ message: "Payment successful", type: "success" });
      setTimeout(() => router.back(), 500);
      return;
    }

    try {
      const { error: joinError } = await supabase.from("attendees").insert({
        event_id: eventId,
        user_id: user.id,
      });

      if (joinError && joinError.code !== "23505") throw joinError;

      notificationManager.setHasUnreadNotifications(true);
      notificationManager.setHasUnreadEvents(true);

      showToast({ message: `Payment successful! You have joined the event.`, type: "success" });
    } catch (err: any) {
      console.error("Join after payment error:", err);
      showToast({ message: "Payment successful but failed to join. Please try again.", type: "error" });
    } finally {
      setTimeout(() => router.back(), 600);
    }
  };

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAYMENT_SUCCESS') {
        completeJoin();
      } else if (data.type === 'CANCEL') {
        router.back();
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        :root {
          --primary: ${Colors.primary};
          --bg: ${Colors.black};
          --card-bg: #121212;
          --input-bg: ${Colors.inputBackground};
          --border: ${Colors.borderDark};
          --text: ${Colors.white};
          --text-secondary: ${Colors.gray};
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: var(--bg);
          color: var(--text);
          padding: 20px;
          margin: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          min-height: 100vh;
        }
        
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        
        .amount-container { text-align: center; margin: 20px 0 30px 0; }
        .amount-label { color: var(--text-secondary); font-size: 14px; margin-bottom: 8px; }
        .amount-value { color: var(--text); font-size: 38px; font-weight: 800; letter-spacing: -1px; }
        
        .section-title { font-size: 16px; margin-bottom: 15px; font-weight: 600; color: var(--text); }
        
        .pill-container {
          display: flex;
          background-color: var(--input-bg);
          border-radius: 50px;
          padding: 4px;
          margin-bottom: 25px;
          border: 1px solid var(--border);
        }
        .pill-option {
          flex: 1;
          text-align: center;
          padding: 12px;
          border-radius: 40px;
          color: var(--text-secondary);
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s, color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .pill-option.active {
          background-color: var(--primary);
          color: var(--text);
        }
        
        .form-container {
          background-color: var(--card-bg);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid var(--border);
          margin-bottom: 150px;
        }
        
        .input-group { margin-bottom: 20px; }
        label { color: var(--text-secondary); font-size: 13px; display: block; margin-bottom: 8px; font-weight: 500; }
        
        .input-wrapper {
          display: flex;
          align-items: center;
          background-color: var(--input-bg);
          border-radius: 12px;
          border: 1px solid var(--border);
          height: 54px;
          width: 100%;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .input-wrapper:focus-within {
          border-color: var(--primary);
        }
        
        .country-code-box {
          padding: 0 15px;
          border-right: 1px solid var(--border);
          background-color: #1a1a1a;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center; /* Centered content */
          font-weight: 600;
          font-size: 14px;
          gap: 6px;
          min-width: 90px;
        }
        
        .flag-icon {
          font-size: 20px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        input {
          background: transparent;
          border: none;
          color: var(--text);
          padding: 0 15px;
          height: 100%;
          width: 100%;
          font-size: 16px;
          outline: none;
          font-family: inherit;
        }
        
        input::placeholder { color: #555; }
        
        .row { display: flex; gap: 15px; }
        .col { flex: 1; }
        
        .footer-fixed {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: var(--bg);
          padding: 24px;
          border-top: 1px solid var(--border);
          z-index: 100;
        }
        
        .secure-badge {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
          font-size: 11px;
          margin-bottom: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .pay-button {
          background-color: var(--primary);
          color: white;
          border: none;
          border-radius: 12px;
          height: 56px;
          width: 100%;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pay-button:disabled { opacity: 0.6; }
        
        .hidden { display: none; }
        
        .timer-screen { text-align: center; padding: 40px 0; }
        .timer-icon {
          width: 90px; height: 90px;
          background: rgba(255, 50, 4, 0.1);
          border: 1px solid var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px auto;
          font-size: 40px;
        }
        .timer-title { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
        .timer-desc { color: var(--text-secondary); font-size: 15px; line-height: 1.5; margin-bottom: 30px; }
        
        .timer-box {
          background: var(--input-bg);
          border-radius: 20px;
          padding: 30px;
          border: 1px solid var(--border);
        }
        .timer-value { color: var(--primary); font-size: 54px; font-weight: 800; }
        
        .simulate-btn {
          margin-top: 30px;
          padding: 14px 24px;
          color: var(--primary);
          background: rgba(255, 50, 4, 0.1);
          border: 1px solid var(--primary);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        
        .loader {
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          animation: spin 0.8s linear infinite;
          display: none;
          margin-right: 10px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div id="checkout-view">
        <div class="amount-container">
          <div class="amount-label">Total Amount</div>
          <div class="amount-value">${currency} ${cost}</div>
        </div>

        <div class="section-title">Payment Method</div>
        <div class="pill-container">
          <div id="wallet-pill" class="pill-option active" onclick="setMethod('wallet')">
            <span>📱</span> Wallet
          </div>
          <div id="card-pill" class="pill-option" onclick="setMethod('card')">
            <span>💳</span> Card
          </div>
        </div>

        <div class="form-container">
          <div id="wallet-form">
            <div class="input-group">
              <label>Mobile Number</label>
              <div class="input-wrapper">
                <div class="country-code-box">
                  <span class="flag-icon">🇪🇬</span>
                  <span>+20</span>
                </div>
                <input type="tel" id="phone" placeholder="1xxxxxxxxx" maxlength="10">
              </div>
            </div>
          </div>

          <div id="card-form" class="hidden">
            <div class="input-group">
              <label>Card Number</label>
              <div class="input-wrapper">
                <input type="tel" id="cardNumber" placeholder="0000 0000 0000 0000">
              </div>
            </div>
            <div class="row">
              <div class="col">
                <label>Expiry</label>
                <div class="input-wrapper">
                  <input type="text" id="expiry" placeholder="MM/YY" maxlength="5">
                </div>
              </div>
              <div class="col">
                <label>CVC</label>
                <div class="input-wrapper">
                  <input type="tel" id="cvc" placeholder="123" maxlength="3">
                </div>
              </div>
            </div>
            <div class="input-group" style="margin-top: 20px;">
              <label>Cardholder Name</label>
              <div class="input-wrapper">
                <input type="text" id="cardName" placeholder="John Doe">
              </div>
            </div>
          </div>
        </div>

        <div class="footer-fixed">
          <div class="secure-badge">🔒 Secure Encrypted Payment</div>
          <button id="pay-button" class="pay-button" onclick="handlePay()">
            <div id="btn-loader" class="loader"></div>
            <span id="btn-text">Pay ${currency} ${cost}</span>
          </button>
        </div>
      </div>

      <div id="timer-view" class="hidden">
        <div class="timer-screen">
          <div class="timer-icon">🔔</div>
          <div class="timer-title">Confirm Validation</div>
          <p class="timer-desc">Please check your wallet app on <span id="display-phone" style="color:var(--primary); font-weight:700;"></span> to authorize.</p>
          <div class="timer-box">
            <div id="timer-value" class="timer-value">05:00</div>
            <div style="color: var(--text-secondary); font-size: 12px; margin-top:5px;">Remaining Time</div>
          </div>
          <button class="simulate-btn" onclick="sendAction('PAYMENT_SUCCESS')">Simulate Confirm (Test)</button>
        </div>
      </div>

      <script>
        let currentMethod = 'wallet';
        let timeLeft = 300;
        let timerId = null;

        function setMethod(method) {
          currentMethod = method;
          document.getElementById('wallet-pill').classList.toggle('active', method === 'wallet');
          document.getElementById('card-pill').classList.toggle('active', method === 'card');
          document.getElementById('wallet-form').classList.toggle('hidden', method !== 'wallet');
          document.getElementById('card-form').classList.toggle('hidden', method !== 'card');
        }

        function handlePay() {
          const btn = document.getElementById('pay-button');
          if (currentMethod === 'wallet') {
            const phone = document.getElementById('phone').value;
            if (phone.length < 10) return alert('Enter valid phone');
            showLoading(true);
            setTimeout(() => {
              showLoading(false);
              document.getElementById('checkout-view').classList.add('hidden');
              document.getElementById('timer-view').classList.remove('hidden');
              document.getElementById('display-phone').innerText = '01' + phone;
              startTimer();
            }, 1000);
          } else {
            const num = document.getElementById('cardNumber').value;
            if (num.length < 10) return alert('Invalid card');
            showLoading(true);
            setTimeout(() => {
              showLoading(false);
              sendAction('PAYMENT_SUCCESS');
            }, 1500);
          }
        }

        function showLoading(l) {
          document.getElementById('btn-loader').style.display = l ? 'block' : 'none';
          document.getElementById('pay-button').disabled = l;
        }

        function startTimer() {
          timerId = setInterval(() => {
            if (timeLeft <= 0) {
              clearInterval(timerId);
              sendAction('CANCEL');
              return;
            }
            timeLeft--;
            const mins = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            document.getElementById('timer-value').innerText = mins + ':' + secs.toString().padStart(2, '0');
          }, 1000);
        }

        function sendAction(type, data = {}) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
          }
        }

        document.getElementById('cardNumber').addEventListener('input', (e) => {
          let v = e.target.value.replace(/\\D/g, '').substring(0, 16);
          e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
        });

        document.getElementById('expiry').addEventListener('input', (e) => {
          let v = e.target.value.replace(/\\D/g, '').substring(0, 4);
          if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
          e.target.value = v;
        });
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" color={Colors.white} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>secure-checkout.eventaat.com</Text>
          <View style={styles.secureIndicator}>
            <Ionicons name="lock-closed" color={Colors.success} size={10} />
            <Text style={styles.secureUrlText}>HTTPS</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => webViewRef.current?.reload()}>
          <Ionicons name="refresh" color={Colors.white} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress * 100}%`, opacity: progress === 1 ? 0 : 1 }]} />
      </View>

      <View style={{ flex: 1 }}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          onMessage={onMessage}
          style={styles.webview}
          onLoadStart={() => {
            setWebViewLoading(true);
            setProgress(0.1);
          }}
          onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
          onLoadEnd={() => {
            setWebViewLoading(false);
            setProgress(1);
          }}
          scrollEnabled={true}
          originWhitelist={['*']}
          textZoom={100}
        />
        {webViewLoading && progress < 0.3 && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDark,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: Colors.gray,
    fontSize: 12,
  },
  secureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  secureUrlText: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  progressContainer: {
    height: 2,
    backgroundColor: 'transparent',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  }
});
