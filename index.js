import { curryN, reduce, isArrayLike } from 'ramda'
import Validation, { Success, Failure } from 'data.validation'


const shakedown = curryN(2, _shakedown)

function _shakedown(rules, req) {
  return reduce(
    (acc, ruleFn) => acc.ap(ruleFn(req)),
    Success(curryN(rules.length, () => req))
  )(rules)
}

export default shakedown


// =============================================================================
//  Utils

export const condition = curryN(3, _condition)

function _condition(conditionFn, rules, req) {
  return conditionFn(req).fold(
    () => Success(),
    () => shakedown(rules, req)
  )
}

export const cond = curryN(2, _cond)

function _cond(sets, req) {
  for (let i = 0; sets.length; i++) {
    const [conditionFn, rules] = sets[i]
    const result = conditionFn(req)
    if (result && (result === true || result.isSuccess)) {
      if (typeof rules === 'function')
        return rules(req)

      if (isArrayLike(rules))
        return shakedown(rules, req)

      return rules
    }
  }

  return Success()
}


export const and = curryN(3, _and)

function _and(testFn, rules, req) {
  return testFn(req).fold(
    Failure,
    () => shakedown(rules, req)
  )
}
