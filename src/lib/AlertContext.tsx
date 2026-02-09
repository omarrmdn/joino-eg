import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
}

interface ToastOptions {
  message: string;
  type?: AlertType;
  duration?: number;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showToast: (options: ToastOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const { width, height } = Dimensions.get('window');

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastOptions, setToastOptions] = useState<ToastOptions | null>(null);

  const showAlert = useCallback((opts: AlertOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const showToast = useCallback((opts: ToastOptions) => {
    setToastOptions(opts);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, opts.duration || 3000);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  const getIcon = (type?: AlertType) => {
    switch (type) {
      case 'success': return { name: 'checkmark-circle', color: Colors.success };
      case 'error': return { name: 'alert-circle', color: Colors.error };
      case 'warning': return { name: 'warning', color: Colors.warning };
      default: return { name: 'information-circle', color: Colors.primary };
    }
  };

  const icon = getIcon(options?.type);
  const toastIcon = getIcon(toastOptions?.type);

  return (
    <AlertContext.Provider value={{ showAlert, showToast, hideAlert }}>
      {children}
      {visible && (
        <Modal
          transparent
          visible={visible}
          animationType="fade"
          onRequestClose={hideAlert}
        >
          <View style={styles.overlay}>
            <TouchableOpacity 
              style={styles.backdrop} 
              activeOpacity={1} 
              onPress={hideAlert} 
            />
            <View style={styles.alertContainer}>
              <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
                <Ionicons name={icon.name as any} size={40} color={icon.color} />
              </View>
              
              <Text style={styles.title}>{options?.title}</Text>
              <Text style={styles.message}>{options?.message}</Text>
  
              <View style={styles.buttonContainer}>
                {options?.buttons && options.buttons.length > 0 ? (
                  options.buttons.map((btn, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        index === options.buttons!.length - 1 ? styles.primaryButton : styles.secondaryButton,
                        btn.style === 'destructive' && { backgroundColor: Colors.error }
                      ]}
                      onPress={() => {
                        if (btn.onPress) btn.onPress();
                        hideAlert();
                      }}
                    >
                      <Text style={[
                        styles.buttonText,
                        index === options.buttons!.length - 1 ? styles.primaryButtonText : styles.secondaryButtonText
                      ]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={hideAlert}
                  >
                    <Text style={[styles.buttonText, styles.primaryButtonText]}>OK</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {toastVisible && (
        <View style={styles.toastContainer}>
           <View style={styles.toastContent}>
              <View style={[styles.toastIconCircle, { backgroundColor: toastIcon.color }]}>
                <Ionicons 
                  name={toastOptions?.type === 'success' ? "checkmark" : (toastIcon.name as any)} 
                  size={16} 
                  color={Colors.white} 
                />
              </View>
              <Text style={styles.toastMessage}>{toastOptions?.message}</Text>
           </View>
        </View>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.blackTransparentDark,
  },
  alertContainer: {
    width: width * 0.85,
    backgroundColor: Colors.lightblack,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.whiteTransparentMedium,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.whiteTransparentVeryLight,
    borderWidth: 1,
    borderColor: Colors.whiteTransparentMedium,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
  primaryButtonText: {
    color: Colors.white,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 110, // Approximately 10 units above a standard high-bottom-tab-bar (80-100px)
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 6,
    paddingRight: 16,
    borderRadius: 30, // Proportional pill shape
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  toastIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  toastMessage: {
    color: Colors.white,
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
});
