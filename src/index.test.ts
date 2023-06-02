import assert from 'assert'
import CodePointMapping from './'

const spans = (cpm: CodePointMapping): Array<[number, number]> => {
  const spanr = (n: any): Array<[number, number]> =>
    [[n.width, n.count], ...(n.next ? spanr(n.next) : [])]
  return spanr((cpm as any).next)
}

test('edge cases', () => {
  let cpm = new CodePointMapping("")
  assert.deepEqual(cpm.insertAt(0, "😀"), [0, "😀"])
  assert.deepEqual(cpm.insertAt(0, ""), [0, ""])
  assert.deepEqual(cpm.insertAt(2, "😀"), [1, "😀"])
  assert.deepEqual(cpm.deleteAt(2, 2), [1, 1])
  assert.deepEqual(cpm.deleteAt(0, 2), [0, 1])

  cpm = new CodePointMapping("a😀b")
  assert.deepEqual(cpm.deleteAt(1, 2), [1, 1])

  assert.throws(() => {
    new CodePointMapping("😀").deleteAt(1, 1)
  })
})

test('unicode test', () => {
  let cpm = new CodePointMapping('a😀b😀😀cd')
  assert.deepEqual(spans(cpm), [[1, 1], [2, 1], [1, 1], [2, 2], [1, 2]])

  assert.deepEqual(cpm.deleteAt(3, 3), [2, 2])
  // a😀😀cd
  assert.deepEqual(spans(cpm), [[1, 1], [2, 2], [1, 2]])

  assert.deepEqual(cpm.insertAt(3, "hi"), [2, "hi"])

  // a😀hi😀cd
  assert.deepEqual(spans(cpm), [[1, 1], [2, 1], [1, 2], [2, 1], [1, 2]])
})

test('indexOfCodepoint', () => {
  let cpm = new CodePointMapping("😀hallo😀")
  assert.deepEqual(cpm.indexOfCodepoint(1), 2)
})

function unicount(str: string): number {
  return [...str].length
}

test('fuzzyish', () => {
  let str = ""
  let cpm = new CodePointMapping(str)

  for (let i = 0; i < 10000; i++) {
    if (Math.random() < 0.7) {
      let chr = Math.random() < 0.5 ? 'a' : '😀wallaby🧟‍♀️'
      let i = Math.floor(Math.random() * (str.length + 1))
      if (str.charCodeAt(i) >= 0xDC00 && str.charCodeAt(i) <= 0xDFFF) {
        i -= 1
      }

      let [off, _] = cpm.insertAt(i, chr)
      assert.deepEqual(unicount(str.slice(0, i)), off)
      assert.deepEqual(cpm.indexOfCodepoint(off), i)
      str = str.slice(0, i) + chr + str.slice(i)

    } else {
      let s = Math.floor(Math.random() * (str.length + 1))
      if (str.charCodeAt(s) >= 0xDC00 && str.charCodeAt(s) <= 0xDFFF) {
        s -= 1
      }
      let e = Math.floor(Math.random() * (str.length + 1))
      if (str.charCodeAt(e) >= 0xDC00 && str.charCodeAt(e) <= 0xDFFF) {
        e -= 1
      }
      if (s > e) {
        [e, s] = [s, e]
      }

      let [off, len] = cpm.deleteAt(s, e - s)
      assert.deepEqual(cpm.indexOfCodepoint(off), s)
      assert.deepEqual(unicount(str.slice(0, s)), off)
      assert.deepEqual(unicount(str.slice(s, e)), len)
      str = str.slice(0, s) + str.slice(e)
    }

    let ss = spans(cpm)
    let width = 0
    for (let i = 0; i < ss.length; i++) {
      let span = ss[i]
      assert.notEqual(span[0], width)
      width = span[0]
      if (i > 0) {
        assert.notEqual(span[1], 0)
      }
    }
  }
})
