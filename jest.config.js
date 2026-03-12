module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["./__tests__/setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop|lucide-react-native|clsx|tailwind-merge|react-native-worklets)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: [
    "**/__tests__/**/*.test.{ts,tsx}",
  ],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    "!**/_layout.tsx",
    "!**/node_modules/**",
  ],
};
