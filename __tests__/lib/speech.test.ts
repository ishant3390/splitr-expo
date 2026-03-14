import { Platform } from "react-native";

// Unmock speech so we test the real module
jest.unmock("@/lib/speech");

describe("speech", () => {
  let isSpeechRecognitionAvailable: typeof import("@/lib/speech").isSpeechRecognitionAvailable;
  let createSpeechRecognition: typeof import("@/lib/speech").createSpeechRecognition;

  beforeEach(() => {
    jest.resetModules();
  });

  describe("isSpeechRecognitionAvailable", () => {
    it("returns false when Platform.OS is not web", () => {
      (Platform as any).OS = "ios";
      const speech = require("@/lib/speech");
      expect(speech.isSpeechRecognitionAvailable()).toBe(false);
    });

    it("returns false on web when SpeechRecognition is not in window", () => {
      (Platform as any).OS = "web";
      // Ensure neither SpeechRecognition nor webkitSpeechRecognition exist
      const win = global as any;
      delete win.SpeechRecognition;
      delete win.webkitSpeechRecognition;
      const speech = require("@/lib/speech");
      expect(speech.isSpeechRecognitionAvailable()).toBe(false);
    });

    it("returns true on web when webkitSpeechRecognition exists", () => {
      (Platform as any).OS = "web";
      const win = global as any;
      win.webkitSpeechRecognition = jest.fn();
      const speech = require("@/lib/speech");
      expect(speech.isSpeechRecognitionAvailable()).toBe(true);
      delete win.webkitSpeechRecognition;
    });

    it("returns true on web when SpeechRecognition exists", () => {
      (Platform as any).OS = "web";
      const win = global as any;
      win.SpeechRecognition = jest.fn();
      const speech = require("@/lib/speech");
      expect(speech.isSpeechRecognitionAvailable()).toBe(true);
      delete win.SpeechRecognition;
    });
  });

  describe("createSpeechRecognition", () => {
    const defaultOptions = {
      onResult: jest.fn(),
      onError: jest.fn(),
      onEnd: jest.fn(),
    };

    it("returns null when Platform.OS is not web", () => {
      (Platform as any).OS = "ios";
      const speech = require("@/lib/speech");
      expect(speech.createSpeechRecognition(defaultOptions)).toBeNull();
    });

    it("returns null on web when SpeechRecognition is not available", () => {
      (Platform as any).OS = "web";
      const win = global as any;
      delete win.SpeechRecognition;
      delete win.webkitSpeechRecognition;
      const speech = require("@/lib/speech");
      expect(speech.createSpeechRecognition(defaultOptions)).toBeNull();
    });

    it("returns start/stop handle on web when SpeechRecognition exists", () => {
      (Platform as any).OS = "web";
      const mockInstance = {
        continuous: true,
        interimResults: false,
        lang: "",
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        start: jest.fn(),
        stop: jest.fn(),
      };
      const win = global as any;
      win.SpeechRecognition = jest.fn(() => mockInstance);

      const speech = require("@/lib/speech");
      const handle = speech.createSpeechRecognition(defaultOptions);

      expect(handle).not.toBeNull();
      expect(typeof handle!.start).toBe("function");
      expect(typeof handle!.stop).toBe("function");

      // Verify configuration
      expect(mockInstance.continuous).toBe(false);
      expect(mockInstance.interimResults).toBe(true);
      expect(mockInstance.lang).toBe("en-US");

      delete win.SpeechRecognition;
    });

    it("calls onResult when recognition fires result event", () => {
      (Platform as any).OS = "web";
      const mockInstance = {
        continuous: true,
        interimResults: false,
        lang: "",
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        start: jest.fn(),
        stop: jest.fn(),
      };
      const win = global as any;
      win.SpeechRecognition = jest.fn(() => mockInstance);

      const onResult = jest.fn();
      const speech = require("@/lib/speech");
      speech.createSpeechRecognition({ ...defaultOptions, onResult });

      // Simulate a result event
      mockInstance.onresult({
        results: [
          [{ transcript: "hello world" }],
        ],
        get length() { return 1; },
      });

      expect(onResult).toHaveBeenCalledWith("hello world", undefined);

      delete win.SpeechRecognition;
    });

    it("calls onError when recognition fires error event", () => {
      (Platform as any).OS = "web";
      const mockInstance = {
        continuous: true,
        interimResults: false,
        lang: "",
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        start: jest.fn(),
        stop: jest.fn(),
      };
      const win = global as any;
      win.SpeechRecognition = jest.fn(() => mockInstance);

      const onError = jest.fn();
      const speech = require("@/lib/speech");
      speech.createSpeechRecognition({ ...defaultOptions, onError });

      mockInstance.onerror({ error: "not-allowed" });
      expect(onError).toHaveBeenCalledWith("not-allowed");

      delete win.SpeechRecognition;
    });

    it("calls onEnd when recognition ends", () => {
      (Platform as any).OS = "web";
      const mockInstance = {
        continuous: true,
        interimResults: false,
        lang: "",
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        start: jest.fn(),
        stop: jest.fn(),
      };
      const win = global as any;
      win.SpeechRecognition = jest.fn(() => mockInstance);

      const onEnd = jest.fn();
      const speech = require("@/lib/speech");
      speech.createSpeechRecognition({ ...defaultOptions, onEnd });

      mockInstance.onend();
      expect(onEnd).toHaveBeenCalled();

      delete win.SpeechRecognition;
    });

    it("uses custom lang when provided", () => {
      (Platform as any).OS = "web";
      const mockInstance = {
        continuous: true,
        interimResults: false,
        lang: "",
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        start: jest.fn(),
        stop: jest.fn(),
      };
      const win = global as any;
      win.SpeechRecognition = jest.fn(() => mockInstance);

      const speech = require("@/lib/speech");
      speech.createSpeechRecognition({ ...defaultOptions, lang: "es-ES" });

      expect(mockInstance.lang).toBe("es-ES");

      delete win.SpeechRecognition;
    });

    it("start() delegates to recognition.start()", () => {
      (Platform as any).OS = "web";
      const mockInstance = {
        continuous: true,
        interimResults: false,
        lang: "",
        onresult: null as any,
        onerror: null as any,
        onend: null as any,
        start: jest.fn(),
        stop: jest.fn(),
      };
      const win = global as any;
      win.SpeechRecognition = jest.fn(() => mockInstance);

      const speech = require("@/lib/speech");
      const handle = speech.createSpeechRecognition(defaultOptions)!;
      handle.start();
      expect(mockInstance.start).toHaveBeenCalled();

      handle.stop();
      expect(mockInstance.stop).toHaveBeenCalled();

      delete win.SpeechRecognition;
    });
  });

  afterEach(() => {
    // Reset platform to default
    (Platform as any).OS = "ios";
  });
});
