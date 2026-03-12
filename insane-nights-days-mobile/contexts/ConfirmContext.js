import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Colors from '../constants/colors';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({ title: '', message: '', buttons: [] });

  const showConfirm = useCallback((title, message, buttons) => {
    setConfig({ title, message, buttons });
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    setConfig({ title: '', message: '', buttons: [] });
  }, []);

  const handlePress = useCallback((button) => {
    hide();
    if (button.onPress) {
      button.onPress();
    }
  }, [hide]);

  return (
    <ConfirmContext.Provider value={{ showConfirm, hideConfirm: hide }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={hide}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={hide}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modal}
          >
            <Text style={styles.title}>{config.title}</Text>
            <ScrollView style={styles.messageScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.message}>{config.message}</Text>
            </ScrollView>
            <View style={styles.buttons}>
              {config.buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.button,
                    i > 0 && styles.buttonSpaced,
                    btn.style === 'destructive' && styles.buttonDestructive,
                    btn.style === 'cancel' && styles.buttonCancel,
                  ]}
                  onPress={() => handlePress(btn)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      btn.style === 'destructive' && styles.buttonTextDestructive,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#1a1a1f',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  messageScroll: {
    maxHeight: 200,
    marginBottom: 16,
  },
  message: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 22,
  },
  buttons: {
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  buttonDestructive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  buttonSpaced: {
    marginTop: 10,
  },
  buttonCancel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  buttonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonTextDestructive: {
    color: '#EF4444',
  },
});
