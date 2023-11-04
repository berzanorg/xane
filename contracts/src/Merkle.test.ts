import { Field, MerkleTree, MerkleWitness } from "o1js"

describe('Merkle Tree Playground', () => {
  it('You can create merkle trees.', async () => {
    const tree = new MerkleTree(8)

    class MyMerkleWitness extends MerkleWitness(8) { }

    tree.setLeaf(0n, Field(7777))

    let calculatedRoot = new MyMerkleWitness(tree.getWitness(0n)).calculateRoot(Field(7777))

    expect(calculatedRoot).toEqual(tree.getRoot())


    tree.setLeaf(1n, Field(555))
    expect(calculatedRoot).not.toEqual(tree.getRoot())

    calculatedRoot = new MyMerkleWitness(tree.getWitness(0n)).calculateRoot(Field(7777))
    expect(calculatedRoot).toEqual(tree.getRoot())
  })
})