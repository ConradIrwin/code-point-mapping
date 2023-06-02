// Internally the
type Node = {
  count: number
  width: number
  next: Node | undefined
}

function append (n: Node, str: string): Node {
  for (let x of str) {
    if (
      x.length === 1 &&
      x.charCodeAt(0) >= 0xd800 &&
      x.charCodeAt(0) <= 0xdfff
    ) {
      throw new Error('unpaired surrogate')
    }
    if (n.width === x.length) {
      n.count += 1
    } else {
      n = n.next = { width: x.length, count: 1, next: undefined }
    }
  }
  return n
}

function graft (n: Node, m: Node | undefined) {
  while (m && m.count === 0) {
    m = m.next
  }
  if (m && m.width === n.width) {
    n.count += m.count
    n.next = m.next
  } else {
    n.next = m
  }
}

function split (n: Node | undefined, unitOff: number): [Node, number] {
  let cpOff = 0

  while (n) {
    if (n.width * n.count < unitOff) {
      unitOff -= n.width * n.count
      cpOff += n.count
      n = n.next
      continue
    }

    if (unitOff % n.width) {
      throw new Error('offset in middle of surrogate')
    }

    n.next = {
      count: n.count - unitOff / n.width,
      width: n.width,
      next: n.next
    }
    n.count = unitOff / n.width
    return [n, cpOff + n.count]
  }
  throw new Error('offset beyond end of string')
}

// CodePointMapping maintains a mapping between utf-16 code units
// (as used by javascript strings) and Unicode code points.
// As the string is modified you should use the `insertAt` and `deleteAt`
// methods to keep the mapping up to date.
//
// Under the hood it tracks runs of characters that are either 1 or 2
// code units wide. For many documents this list is significantly shorter
// (and thus faster to process) than recounting the string every time.
export default class CodePointMapping {
  private next: Node

  constructor (str: string) {
    this.next = { width: 1, count: 0, next: undefined }
    append(this.next, str)
  }

  // deleteAt maps the offset and length given in terms of utf-16
  // code units to the same in terms of unicode code points,
  // and updates the mapping appropriately.
  deleteAt (unitOff: number, unitLen: number): [number, number] {
    let [node, cpOff] = split(this.next, unitOff)
    let [endNode, cpLen] = split(node.next, unitLen)

    graft(node, endNode.next)
    return [cpOff, cpLen]
  }

  // insertAt maps the offset given in terms of utf-16
  // code units to the same in terms of unicode code points,
  // splits the string into unicode code points,
  // and updates the mapping appropriately.
  insertAt (unitOff: number, str: string): [number, ...string[]] {
    let [node, cpOff] = split(this.next, unitOff)
    let after = node.next

    graft(append(node, str), after)
    return [cpOff, ...str]
  }

  // indexOfCodepoint converts the position in terms of unicode
  // code points to utf-16 code units.
  indexOfCodepoint (cpOff: number): number {
    let node: Node | undefined = this.next
    let unitOff = 0
    while (node) {
      if (node.count >= cpOff) {
        return unitOff + cpOff * node.width
      }

      cpOff -= node.count
      unitOff += node.count * node.width
      node = node.next
    }

    throw new Error('cpOff outside of string')
  }
}
