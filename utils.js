import { Success, Failure } from 'data.validation'
import { curryN, prop, reduce, compose, isNil, always, cond, lensProp, over, append, not, isEmpty, tryCatch, test as regexTest, gt, lt, identity, length, is, flip, contains, equals, lte } from 'ramda'

const isArray = Array.isArray.bind(Array)

const catchRecovery = (err) => {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development')
    console.error(`Warning: A test function threw an error`, err);

  return false
}

// test :: string -> (fn -> bool) -> string -> object -> Validation([])
export const test = curryN(4, (errorMessage, testFn, attrName, req) => {
  const testFailure = cond([
    [compose(isNil, prop('errorMessage')), () => Failure([])],
    [compose(isNil, prop('attrName')), () => Failure([[errorMessage]])],
    [always(true), () => Failure([[attrName, errorMessage]])],
  ])({ errorMessage, attrName })

  const selectProp = is(String, attrName) ? prop(attrName) : identity

  return cond([
    [compose(isNil, selectProp), () => testFailure],
    [tryCatch(compose(testFn, selectProp), catchRecovery), () => Success()],
    [always(true), () => testFailure]
  ])(req)
})


// testRequired :: string -> object -> Validation([])
export const testRequired = test('Required', compose(not, isEmpty))


// mergeFailures :: [[key, value]] => { key: [values] }
export const mergeFailures = reduce((acc, item) => {
  const parsedItem = cond([
    [is(String), value => ({ value })],
    [compose(not, isArray), (_item) => {
      console.error(`Warning: Found "${typeof _item}", expected Array or String in mergeFailures`);
    }],
    [compose(equals(1), length), ([value]) => ({ value })],
    [compose(lte(2), length), ([key, value]) => ({ key, value })],
  ])(item)

  const {
    key = 'error',
    value = 'Could not determine cause of issue',
  } = parsedItem

  return over(lensProp(key), cond([
    [Array.isArray, append(value)],    // appends value to array with 'key'
    [always(true), always([value])]    // initializes array of messages
  ]))(acc)
}, {})


// NOTE: sometimes this is useful, specific use case is still fussy
// mergeFailuresArr :: [[key, value]] => [{ key: [values] }]
export const mergeFailuresArr = validations => [mergeFailures(validations)]


const simpleCharSetMsg = 'Valid characters are: a-z, 0-9, _, - and space'
export const testSimpleCharSet = test(simpleCharSetMsg,
  regexTest(/^[\w\- ]*$/i))


export const testMaxLength = n => test(`Max ${n} characters`,
  compose(gt(n + 1), length))

export const testMinLength = n => test(`Minimum ${n} characters`,
  compose(lt(n - 1), length))


// export const isOneOf = curryN(2, (xs, x) => any(equals(x), xs))
export const isOneOf = flip(contains)
