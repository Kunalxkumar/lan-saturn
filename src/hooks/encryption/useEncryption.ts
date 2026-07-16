import { useState, useEffect, useRef } from 'react';
import sodium from 'libsodium-wrappers-sumo';
import { encryptText, decryptText, encryptBytes, decryptBytes } from '../../lib/crypto';

export default function useEncryption() {
    const defaultE2EE = 'LAN-SATURN-DEFAULT-KEY';
    const [encryptionPassphrase, setEncryptionPassphrase] = useState(
        localStorage.getItem('lanSaturn_passphrase') || defaultE2EE
    );
    const [isEncrypted, setIsEncrypted] = useState(true);
    const [cryptoReady, setCryptoReady] = useState(false);
    
    const encryptionPassphraseRef = useRef(encryptionPassphrase);

    useEffect(() => {
        encryptionPassphraseRef.current = encryptionPassphrase;
        if (!encryptionPassphrase) {
            setIsEncrypted(false);
            localStorage.removeItem('lanSaturn_passphrase');
        } else {
            setIsEncrypted(true);
            if (encryptionPassphrase !== 'LAN-SATURN-DEFAULT-KEY') {
                localStorage.setItem('lanSaturn_passphrase', encryptionPassphrase);
            } else {
                localStorage.removeItem('lanSaturn_passphrase');
            }
        }
    }, [encryptionPassphrase]);

    useEffect(() => {
        sodium.ready.then(() => {
            setCryptoReady(true);
        });
    }, []);

    return {
        encryptionPassphrase,
        setEncryptionPassphrase,
        encryptionPassphraseRef,
        isEncrypted,
        cryptoReady,
        encryptText,
        decryptText,
        encryptBytes,
        decryptBytes
    };
}
