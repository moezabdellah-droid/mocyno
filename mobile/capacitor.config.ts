import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.mocyno.mobile',
    appName: 'Mo-Cyno',
    webDir: '../public/mobile',
    server: {
        androidScheme: 'https'
    }
};

export default config;
