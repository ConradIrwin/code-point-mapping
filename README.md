code-point-mapping provides a way to map between utf16 string indices
and unicode code point offsets effectively.

Unicode code points require either one or two utf16 code units to represent them. Characters outside the Basic Multilingual Plane are represented as two
surrogate pairs. This means as soon as you use characters (like Emoji) that
are in this state, you need to do some work to map between utf16 indexes and
unicode code point offsets.

This package was designed for use with [automerge](https://automerge.org), which requires that you specify offsets in terms of unicode code points,
and so only the APIs I needed to make that work are here.

For example:

```javascript
import CodePointMapping from 'code-point-mapping'
import * as automerge from '@automerge/automerge'

let doc1 = automerge.from({ str: new automerge.Text('😀🎉✈️') })
let cpm = new CodePointMapping(doc1.str)

cpm.indexForCodepoint(1) // => 2

doc1 = automerge.change(doc1, d => {
  d.str.deleteAt(...cpm.deleteAt(0, 2)) // d.str.deleteAt(0, 1)
  d.str.insertAt(...cpm.insertAt(2, '🧟‍♀️')) // d.str.insertAt(1, ..."🧟‍♀️")
})
```

NOTE: This library assumes that your strings are valid unicode and do not
contain unpaired surrogates.
