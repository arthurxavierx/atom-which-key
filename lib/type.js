/** @babel */

function inherit(sup, sub) {
  let C = function() {};
  C.prototype = sup.prototype;
  sub.prototype = new C();
  sub.prototype.constructor = sub;
  return sub;
}

function verifyArguments(name, constructor, args) {
  let missingArgs = constructor.filter(arg => !(arg in args));
  if (missingArgs.length > 0)
    throw new TypeError(`Type constructor ${name} is missing arguments ${missingArgs}`);
}

/**
 * Creates an Algebraic Data Type from a dictionary of constructor names
 * and constructor parameters (array of strings).
 *
 * A type for an optional value can thus be created as:
 *
 * const Maybe = new Type({
 *   Just: ['value'],
 *   Nothing: [],
 * });
 * const { Just, Nothing } = Maybe;
 *
 * let something = Just(1);
 * let nothing = Nothing();
 *
 * something instanceof Maybe === true;
 * something instanceof Just === true;
 * something instanceof Nothing === false;
 *
 * nothing instanceof Maybe === true;
 * nothing instanceof Just === false;
 * nothing instanceof Nothing === true;
 *
 * something.value === 1;
 * nothing.value === undefined;
 *
 * @param  {Object} constructors Dictionary of constructors and constructor parameters.
 * @return {Type} generated data type with created type constructors as object keys.
 */
export default function(constructors) {
  function Type() {}

  for (let name in constructors) {
    function Constructor(args) { // eslint-disable-line no-inner-declarations
      if (!(this instanceof Constructor))
        return new Constructor(args);
      verifyArguments(name, constructors[name], args);
      for (let i in args)
        this[i] = args[i];

      this.__ctor__ = name;
    }

    inherit(Type, Constructor);
    Type[name] = constructors[name] instanceof Array && constructors[name].length > 0
      ? Constructor
      : new Constructor();
  }

  return Type;
}

export function Case(value, cases = {}) {
  return typeof cases[value] === 'function'
    ? cases[value](value)
    : typeof cases._ === 'function'
      ? cases._(value)
      : undefined;
}

export function CaseConstructor(value, cases = {}) {
  let ctor = value.__ctor__;
  return typeof cases[ctor] === 'function'
    ? cases[ctor](value)
    : typeof cases._ === 'function'
      ? cases._(value)
      : undefined;
}
export const CaseC = CaseConstructor;
