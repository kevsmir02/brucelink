import {
  rf,
  ir,
  wifi,
  nav,
  power,
  screen,
  sound,
  storage,
  badusb,
  interpreter,
  gpio,
  crypto,
  settings,
  loader,
  util,
} from '../../src/services/commands';

// ---------------------------------------------------------------------------
// RF (CC1101 / Sub-GHz)
// ---------------------------------------------------------------------------
describe('rf commands', () => {
  it('builds rx command with default frequency', () => {
    expect(rf.rx()).toBe('rf rx');
  });

  it('builds rx command with custom frequency', () => {
    expect(rf.rx({ frequency: 433920000 })).toBe('rf rx 433920000');
  });

  it('builds rx command with raw flag', () => {
    expect(rf.rx({ raw: true })).toBe('rf rx --raw');
  });

  it('builds rx command with frequency and raw flag', () => {
    expect(rf.rx({ frequency: 315000000, raw: true })).toBe('rf rx 315000000 --raw');
  });

  it('builds tx command with all parameters', () => {
    expect(rf.tx({ key: '0x447503', frequency: 433920000, te: 174, count: 10 })).toBe(
      'rf tx 0x447503 433920000 174 10',
    );
  });

  it('builds tx command with defaults', () => {
    expect(rf.tx({ key: '0xABCDEF' })).toBe('rf tx 0xABCDEF 0 0 10');
  });

  it('builds scan command', () => {
    expect(rf.scan({ startFrequency: 430000000, stopFrequency: 440000000 })).toBe(
      'rf scan 430000000 440000000',
    );
  });

  it('builds tx_from_file command', () => {
    expect(rf.txFromFile({ filepath: '/subghz/gate.sub' })).toBe(
      'rf tx_from_file "/subghz/gate.sub"',
    );
  });

  it('builds RfSend JSON command', () => {
    const result = rf.sendJson({
      Data: '0x447503',
      Bits: 24,
      Protocol: 1,
      Pulse: 174,
      Repeat: 10,
    });
    expect(result).toBe(
      'RfSend {"Data":"0x447503","Bits":24,"Protocol":1,"Pulse":174,"Repeat":10}',
    );
  });

  it('builds RfSend JSON with defaults', () => {
    const result = rf.sendJson({ Data: '0xABC' });
    expect(result).toBe('RfSend {"Data":"0xABC","Bits":32,"Protocol":1,"Pulse":0,"Repeat":10}');
  });
});

// ---------------------------------------------------------------------------
// IR
// ---------------------------------------------------------------------------
describe('ir commands', () => {
  it('builds rx command', () => {
    expect(ir.rx()).toBe('ir rx');
  });

  it('builds rx command with raw flag', () => {
    expect(ir.rx({ raw: true })).toBe('ir rx --raw');
  });

  it('builds tx command', () => {
    expect(ir.tx({ protocol: 'NEC', address: '20DF0000', command: '10EF0000' })).toBe(
      'ir tx NEC 20DF0000 10EF0000',
    );
  });

  it('builds tx_raw command', () => {
    expect(ir.txRaw({ frequency: 38000, samples: '500 500 1000 500' })).toBe(
      'ir tx_raw 38000 500 500 1000 500',
    );
  });

  it('builds tx_from_file command', () => {
    expect(ir.txFromFile({ filepath: '/ir/tv_power.ir' })).toBe(
      'ir tx_from_file "/ir/tv_power.ir"',
    );
  });

  it('builds IRSend JSON command', () => {
    const result = ir.sendJson({ Protocol: 'NEC', Bits: 32, Data: '0x20DF10EF' });
    expect(result).toBe('IRSend {"Protocol":"NEC","Bits":32,"Data":"0x20DF10EF"}');
  });

  it('builds IRSend JSON with defaults', () => {
    const result = ir.sendJson({ Data: '0x20DF10EF' });
    expect(result).toBe('IRSend {"Protocol":"NEC","Bits":32,"Data":"0x20DF10EF"}');
  });
});

// ---------------------------------------------------------------------------
// WiFi
// ---------------------------------------------------------------------------
describe('wifi commands', () => {
  it('builds wifi on', () => {
    expect(wifi.on()).toBe('wifi on');
  });

  it('builds wifi off', () => {
    expect(wifi.off()).toBe('wifi off');
  });

  it('builds wifi add', () => {
    expect(wifi.add({ ssid: 'MyNet', password: 's3cret' })).toBe('wifi add MyNet s3cret');
  });

  it('builds webui command', () => {
    expect(wifi.webui()).toBe('webui');
  });

  it('builds webui --noAp command', () => {
    expect(wifi.webui({ noAp: true })).toBe('webui --noAp');
  });

  it('builds arp command', () => {
    expect(wifi.arp()).toBe('arp');
  });

  it('builds listen command', () => {
    expect(wifi.listen()).toBe('listen');
  });

  it('builds sniffer command', () => {
    expect(wifi.sniffer()).toBe('sniffer');
  });
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
describe('nav commands', () => {
  it('builds nav select', () => {
    expect(nav.press('sel')).toBe('nav sel');
  });

  it('builds nav with duration', () => {
    expect(nav.press('up', 100)).toBe('nav up 100');
  });

  it('builds all directions', () => {
    const directions = ['sel', 'esc', 'up', 'down', 'next', 'prev'] as const;
    directions.forEach(d => {
      expect(nav.press(d)).toBe(`nav ${d}`);
    });
  });
});

// ---------------------------------------------------------------------------
// Power
// ---------------------------------------------------------------------------
describe('power commands', () => {
  it('builds poweroff', () => {
    expect(power.off()).toBe('poweroff');
  });

  it('builds reboot', () => {
    expect(power.reboot()).toBe('reboot');
  });

  it('builds sleep', () => {
    expect(power.sleep()).toBe('sleep');
  });
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
describe('screen commands', () => {
  it('builds brightness command', () => {
    expect(screen.brightness(128)).toBe('screen brightness 128');
  });

  it('builds color rgb command', () => {
    expect(screen.colorRgb({ red: 255, green: 0, blue: 128 })).toBe(
      'screen color rgb 255 0 128',
    );
  });

  it('builds color hex command', () => {
    expect(screen.colorHex('FF00FF')).toBe('screen color hex FF00FF');
  });

  it('builds clock command', () => {
    expect(screen.clock()).toBe('clock');
  });
});

// ---------------------------------------------------------------------------
// Sound
// ---------------------------------------------------------------------------
describe('sound commands', () => {
  it('builds tone command with defaults', () => {
    expect(sound.tone()).toBe('tone 500 500');
  });

  it('builds tone command with custom values', () => {
    expect(sound.tone({ frequency: 1000, duration: 200 })).toBe('tone 1000 200');
  });

  it('builds play command', () => {
    expect(sound.play('/audio/song.mp3')).toBe('play /audio/song.mp3');
  });
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
describe('storage commands', () => {
  it('builds list command with default path', () => {
    expect(storage.list()).toBe('storage list /');
  });

  it('builds list command with path', () => {
    expect(storage.list('/subghz')).toBe('storage list /subghz');
  });

  it('builds read command', () => {
    expect(storage.read('/test.txt')).toBe('storage read /test.txt');
  });

  it('builds remove command', () => {
    expect(storage.remove('/test.txt')).toBe('storage remove /test.txt');
  });

  it('builds rename command', () => {
    expect(storage.rename('/old.txt', 'new.txt')).toBe('storage rename /old.txt new.txt');
  });

  it('builds copy command', () => {
    expect(storage.copy('/src.txt', 'dst.txt')).toBe('storage copy /src.txt dst.txt');
  });

  it('builds mkdir command', () => {
    expect(storage.mkdir('/newdir')).toBe('storage mkdir /newdir');
  });

  it('builds rmdir command', () => {
    expect(storage.rmdir('/olddir')).toBe('storage rmdir /olddir');
  });

  it('builds md5 command', () => {
    expect(storage.md5('/file.bin')).toBe('storage md5 /file.bin');
  });

  it('builds stat command', () => {
    expect(storage.stat('/file.bin')).toBe('storage stat /file.bin');
  });

  it('builds free command', () => {
    expect(storage.free('sd')).toBe('storage free sd');
  });
});

// ---------------------------------------------------------------------------
// BadUSB
// ---------------------------------------------------------------------------
describe('badusb commands', () => {
  it('builds run_from_file command', () => {
    expect(badusb.runFromFile('/scripts/payload.txt')).toBe(
      'badusb run_from_file "/scripts/payload.txt"',
    );
  });
});

// ---------------------------------------------------------------------------
// Interpreter (JS)
// ---------------------------------------------------------------------------
describe('interpreter commands', () => {
  it('builds run_from_file command', () => {
    expect(interpreter.runFromFile('/scripts/app.js')).toBe('js run_from_file "/scripts/app.js"');
  });
});

// ---------------------------------------------------------------------------
// GPIO
// ---------------------------------------------------------------------------
describe('gpio commands', () => {
  it('builds mode command', () => {
    expect(gpio.mode(5, 1)).toBe('gpio mode 5 1');
  });

  it('builds set command', () => {
    expect(gpio.set(5, 1)).toBe('gpio set 5 1');
  });

  it('builds read command', () => {
    expect(gpio.read(5)).toBe('gpio read 5');
  });
});

// ---------------------------------------------------------------------------
// Crypto
// ---------------------------------------------------------------------------
describe('crypto commands', () => {
  it('builds decrypt command', () => {
    expect(crypto.decrypt('/encrypted.bin', 'mypass')).toBe(
      'crypto decrypt_from_file /encrypted.bin mypass',
    );
  });

  it('builds encrypt command', () => {
    expect(crypto.encrypt('/plain.txt', 'mypass')).toBe(
      'crypto encrypt_to_file /plain.txt mypass',
    );
  });
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
describe('settings commands', () => {
  it('builds get all settings', () => {
    expect(settings.getAll()).toBe('settings');
  });

  it('builds get specific setting', () => {
    expect(settings.get('bright')).toBe('settings bright');
  });

  it('builds set setting', () => {
    expect(settings.set('bright', '200')).toBe('settings bright 200');
  });

  it('builds factory reset', () => {
    expect(settings.factoryReset()).toBe('factory_reset');
  });
});

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------
describe('loader commands', () => {
  it('builds list command', () => {
    expect(loader.list()).toBe('loader list');
  });

  it('builds open command', () => {
    expect(loader.open('RFID')).toBe('loader open RFID');
  });
});

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------
describe('util commands', () => {
  it('builds info command', () => {
    expect(util.info()).toBe('info');
  });

  it('builds help command', () => {
    expect(util.help()).toBe('help');
  });

  it('builds uptime command', () => {
    expect(util.uptime()).toBe('uptime');
  });

  it('builds date command', () => {
    expect(util.date()).toBe('date');
  });

  it('builds free command', () => {
    expect(util.free()).toBe('free');
  });

  it('builds optionsJSON command', () => {
    expect(util.optionsJson()).toBe('optionsJSON');
  });
});

// ---------------------------------------------------------------------------
// File execution helper
// ---------------------------------------------------------------------------
describe('file execution commands', () => {
  it('returns correct command for .ir files', () => {
    expect(ir.txFromFile({ filepath: '/ir/tv.ir' })).toBe('ir tx_from_file "/ir/tv.ir"');
  });

  it('returns correct command for .sub files', () => {
    expect(rf.txFromFile({ filepath: '/subghz/gate.sub' })).toBe(
      'rf tx_from_file "/subghz/gate.sub"',
    );
  });

  it('returns correct command for .js files', () => {
    expect(interpreter.runFromFile('/scripts/app.js')).toBe('js run_from_file "/scripts/app.js"');
  });

  it('returns correct command for .txt badusb files', () => {
    expect(badusb.runFromFile('/scripts/duck.txt')).toBe(
      'badusb run_from_file "/scripts/duck.txt"',
    );
  });
});
