/**
 * Give Intl a fixed default locale, on both runtimes.
 *
 * THE BUG THIS EXISTS FOR
 * -----------------------
 * Astryx formats calendar dates through its own helper:
 *
 *     // @astryxdesign/core/dist/utils/plainDate.js
 *     export function plainDateFormat(pd, options) {
 *       return new Intl.DateTimeFormat(undefined, options).format(...);
 *     }
 *
 * `undefined` means "whatever this runtime's default is", and the two runtimes
 * do not agree. Node takes it from the operating system; a browser takes it
 * from navigator.language. On a machine whose OS is set to ar-EG, the server
 * renders "أغسطس ٢٠٢٦" and a browser set to plain `ar` renders "أغسطس 2026",
 * and React reports a hydration mismatch on every screen carrying a date
 * field. Measured, not assumed: Node here resolves the default to ar-EG
 * (numberingSystem "arab"), the browser resolves `ar` to "latn".
 *
 * This is NOT only a Windows-development artifact. A Linux server defaults to
 * en-US and would render Latin digits, while a lawyer whose browser is set to
 * ar-EG renders Arabic-Indic ones -- the same mismatch, in production, in the
 * direction that matters more.
 *
 * The component takes no locale prop, so the app cannot pass one in. Passing a
 * pinned tag to InternationalizationProvider was tried and changed nothing,
 * because this helper never consults the provider.
 *
 * WHY PATCH A GLOBAL, WHICH IS NOT A SMALL THING TO DO
 * ---------------------------------------------------
 * The alternatives were worse. Vendoring Calendar (`astryx swizzle`) does not
 * help: the swizzled component still imports plainDateFormat from the package.
 * Patching node_modules is undone by the next install. Setting LANG/LC_ALL
 * does not move Node's default on Windows -- tested.
 *
 * So this narrows the blast radius instead of avoiding it: ONLY the
 * no-locale-given call is affected, which is precisely the broken case. Every
 * call that names a locale -- including all of lib/i18n/format.ts -- passes
 * through untouched, and applying it twice is a no-op.
 */

import { INTL_LOCALE, DEFAULT_LOCALE } from "./locale";

// The tag the app itself formats with. Not a bare "ar": that leaves the
// numbering system to the runtime again, which is the whole problem.
const PINNED = INTL_LOCALE[DEFAULT_LOCALE];

const PATCHED = Symbol.for("legalos.intl.pinned");

type Ctor = typeof Intl.DateTimeFormat | typeof Intl.NumberFormat;

function pin<T extends Ctor>(original: T): T {
  const wrapped = function (
    this: unknown,
    locales?: Intl.LocalesArgument,
    options?: object,
  ) {
    // Constructed with `original` as the new.target, so what comes back is a
    // genuine Intl.DateTimeFormat/NumberFormat -- same prototype, same
    // instanceof, same everything. Only the missing first argument is filled.
    return Reflect.construct(original as never, [locales ?? PINNED, options]);
  } as unknown as T;

  // Inherit the statics (supportedLocalesOf) rather than copying them.
  Object.setPrototypeOf(wrapped, original);
  // And carry the ORIGINAL prototype across, so
  // `new Intl.DateTimeFormat() instanceof Intl.DateTimeFormat` stays true.
  // Without this it is false -- a function object gets its own fresh
  // .prototype -- and any library that instanceof-checks a formatter breaks
  // in a way that has nothing to do with locales. defineProperty because a
  // function's `prototype` is not writable through assignment here.
  Object.defineProperty(wrapped, "prototype", {
    value: original.prototype,
    writable: false,
    enumerable: false,
    configurable: false,
  });
  return wrapped;
}

const scope = globalThis as unknown as Record<symbol, true | undefined>;

if (!scope[PATCHED]) {
  scope[PATCHED] = true;
  Intl.DateTimeFormat = pin(Intl.DateTimeFormat) as typeof Intl.DateTimeFormat;
  // NumberFormat for the same reason: a bare toLocaleString() anywhere in a
  // third-party component picks the runtime default and diverges identically.
  Intl.NumberFormat = pin(Intl.NumberFormat) as typeof Intl.NumberFormat;
}

export {};
