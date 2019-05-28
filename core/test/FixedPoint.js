const { didContractThrow } = require("../../common/SolidityTestUtils.js");

const FixedPointTest = artifacts.require("FixedPointTest");

contract("FixedPoint", function(accounts) {
  const uint_max = web3.utils.toBN("115792089237316195423570985008687907853269984665640564039457584007913129639935");

  it("Construction", async function() {
    const fixedPoint = await FixedPointTest.new();

    assert.equal(await fixedPoint.wrapFromUnscaledUint("53"), web3.utils.toWei("53"));

    // Reverts on overflow.
    const tenToSixty = web3.utils.toBN("10").pow(web3.utils.toBN("60"));
    assert(await didContractThrow(fixedPoint.wrapFromUnscaledUint(tenToSixty)));
  });

  it("Comparison", async function() {
    const fixedPoint = await FixedPointTest.new();

    assert.isTrue(await fixedPoint.wrapIsGreaterThan(web3.utils.toWei("2"), web3.utils.toWei("1")));
    assert.isFalse(await fixedPoint.wrapIsGreaterThan(web3.utils.toWei("2"), web3.utils.toWei("2")));
    assert.isFalse(await fixedPoint.wrapIsGreaterThan(web3.utils.toWei("2"), web3.utils.toWei("3")));

    assert.isFalse(await fixedPoint.wrapIsLessThan(web3.utils.toWei("2"), web3.utils.toWei("1")));
    assert.isFalse(await fixedPoint.wrapIsLessThan(web3.utils.toWei("2"), web3.utils.toWei("2")));
    assert.isTrue(await fixedPoint.wrapIsLessThan(web3.utils.toWei("2"), web3.utils.toWei("3")));

    //TODO: Add issLessThan & isGreaterThan tests for the FixedPoint uint comparisons
  });

  it("Addition", async function() {
    const fixedPoint = await FixedPointTest.new();

    // Additions below 10**18.
    let sum = await fixedPoint.wrapAdd("99", "7");
    assert.equal(sum, "106");

    // Additions above 10**18.
    sum = await fixedPoint.wrapAdd(web3.utils.toWei("99"), web3.utils.toWei("7"));
    assert.equal(sum, web3.utils.toWei("106"));

    // Reverts on overflow.
    // (uint_max-10) + 11 will overflow.
    assert(await didContractThrow(fixedPoint.wrapAdd(uint_max.sub(web3.utils.toBN("10")), web3.utils.toBN("11"))));
  });

  it("Mixed addition", async function() {
    const fixedPoint = await FixedPointTest.new();

    // Basic mixed addition.
    const sum = await fixedPoint.wrapMixedAdd(web3.utils.toWei("1.5"), "4");
    assert.equal(sum.toString(), web3.utils.toWei("5.5"));

    // Reverts if uint (second argument) can't be represented as an Unsigned.
    const tenToSixty = web3.utils.toBN("10").pow(web3.utils.toBN("60"));
    assert(await didContractThrow(fixedPoint.wrapMixedAdd("0", tenToSixty)));

    // Reverts if both arguments can be represented but the sum overflows.
    // TODO: Add this annoying test case.
  });

  it("Subtraction", async function() {
    const fixedPoint = await FixedPointTest.new();

    // Subtractions below 10**18.
    let sum = await fixedPoint.wrapSub("99", "7");
    assert.equal(sum, "92");

    // Subtractions above 10**18.
    sum = await fixedPoint.wrapSub(web3.utils.toWei("99"), web3.utils.toWei("7"));
    assert.equal(sum, web3.utils.toWei("92"));

    // Reverts on underflow.
    assert(await didContractThrow(fixedPoint.wrapSub("1", "2")));
  });

  it("Mixed subtraction", async function() {
    const fixedPoint = await FixedPointTest.new();

    // Basic mixed subtraction case.
    const difference = await fixedPoint.wrapMixedSub(web3.utils.toWei("11.5"), "2");
    assert.equal(difference, web3.utils.toWei("9.5"));

    // Reverts if uint (second argument) can't be represented as an Unsigned.
    const tenToSixty = web3.utils.toBN("10").pow(web3.utils.toBN("60"));
    // 10**70 is the scaled version of 10**52, which can be represented. In this test case, we want to make sure
    // that the first argument is greater than the second, because that would be testing the underflow case instead.
    const tenToSeventy = web3.utils.toBN("10").pow(web3.utils.toBN("70"));
    assert(await didContractThrow(fixedPoint.wrapMixedSub(tenToSeventy, tenToSixty)));

    // Reverts on underflow (i.e., second argument larger than first).
    assert(await didContractThrow(fixedPoint.wrapMixedSub(web3.utils.toWei("1.5"), "2")));
  });

  it("Mixed subtraction opposite", async function() {
    const fixedPoint = await FixedPointTest.new();

    // Basic mixed subtraction case.
    const difference = await fixedPoint.wrapMixedSubOpposite("10", web3.utils.toWei("5.5"));
    assert.equal(difference, web3.utils.toWei("4.5"));

    // Reverts on underflow (i.e., second argument larger than first).
    assert(await didContractThrow(fixedPoint.wrapMixedSub("5", web3.utils.toWei("5.5"))));
  });

  it("Multiplication", async function() {
    const fixedPoint = await FixedPointTest.new();

    // Whole numbers above 10**18.
    let product = await fixedPoint.wrapMul(web3.utils.toWei("5"), web3.utils.toWei("17"));
    assert.equal(product.toString(), web3.utils.toWei("85"));

    // Fractions, no precision loss.
    product = await fixedPoint.wrapMul(web3.utils.toWei("0.0001"), web3.utils.toWei("5"));
    assert.equal(product.toString(), web3.utils.toWei("0.0005"));

    // Fractions, precision loss, rounding down.
    // 1.2 * 2e-18 = 2.4e-18, which can't be represented and gets rounded down to 2.
    product = await fixedPoint.wrapMul(web3.utils.toWei("1.2"), "2");
    assert.equal(product.toString(), "2");

    // Reverts on overflow.
    // (uint_max - 1) * 2 overflows.
    assert(await didContractThrow(fixedPoint.wrapMul(uint_max.sub(web3.utils.toBN("1")), web3.utils.toWei("2"))));
  });

  it("Mixed multiplication", async function() {
    const fixedPoint = await FixedPointTest.new();

    let product = await fixedPoint.wrapMixedMul(web3.utils.toWei("1.5"), "3");
    assert.equal(product, web3.utils.toWei("4.5"));

    // We can handle outputs up to 10^59.
    const tenToSixty = web3.utils.toBN("10").pow(web3.utils.toBN("60"));
    const tenToFiftyNine = web3.utils.toBN("10").pow(web3.utils.toBN("59"));
    product = await fixedPoint.wrapMixedMul(web3.utils.toWei("0.1"), tenToSixty);
    assert.equal(product.toString(), web3.utils.toWei(tenToFiftyNine.toString()));

    // Reverts on overflow.
    // (uint_max / 2) * 3 overflows.
    assert(await didContractThrow(fixedPoint.wrapMixedMul(uint_max.div(web3.utils.toBN("2")), "3")));
  });

  it("Division", async function() {
    const fixedPoint = await FixedPointTest.new();

    // Normal division case.
    let quotient = await fixedPoint.wrapDiv(web3.utils.toWei("150.3"), web3.utils.toWei("3"));
    assert.equal(quotient.toString(), web3.utils.toWei("50.1"));

    // Divisor < 1.
    quotient = await fixedPoint.wrapDiv(web3.utils.toWei("2"), web3.utils.toWei("0.01"));
    assert.equal(quotient.toString(), web3.utils.toWei("200"));

    // Fractions, precision loss, rounding down.
    // 1 / 3 = 0.3 repeating, which can't be represented and gets rounded down to 0.333333333333333333.
    quotient = await fixedPoint.wrapDiv(web3.utils.toWei("1"), web3.utils.toWei("3"));
    assert.equal(quotient.toString(), "3".repeat(18));

    // Reverts on division by zero.
    assert(await didContractThrow(fixedPoint.wrapDiv("1", "0")));
  });

  it("Mixed division", async function() {
    const fixedPoint = await FixedPointTest.new();

    // Normal mixed division case.
    let quotient = await fixedPoint.wrapMixedDiv(web3.utils.toWei("150.3"), "3");
    assert.equal(quotient.toString(), web3.utils.toWei("50.1"));

    // Reverts on division by zero.
    assert(await didContractThrow(fixedPoint.wrapMixedDiv("1", "0")));
  });

  it("Mixed division opposite", async function() {
    const fixedPoint = await FixedPointTest.new();

    // Normal mixed division case.
    let quotient = await fixedPoint.wrapMixedDivOpposite("120", web3.utils.toWei("3.2"));
    assert.equal(quotient.toString(), web3.utils.toWei("37.5"));

    // Reverts on division by zero.
    assert(await didContractThrow(fixedPoint.wrapMixedDivOpposite("1", "0")));
  });

  it("Power", async function() {
    const fixedPoint = await FixedPointTest.new();

    // 1.5^0 = 1
    assert.equal(await fixedPoint.wrapPow(web3.utils.toWei("1.5"), "0"), web3.utils.toWei("1"));

    // 1.5^1 = 1.5
    assert.equal(await fixedPoint.wrapPow(web3.utils.toWei("1.5"), "1"), web3.utils.toWei("1.5"));

    // 1.5^2 = 2.25.
    assert.equal(await fixedPoint.wrapPow(web3.utils.toWei("1.5"), "2"), web3.utils.toWei("2.25"));

    // 1.5^3 = 3.375
    assert.equal(await fixedPoint.wrapPow(web3.utils.toWei("1.5"), "3"), web3.utils.toWei("3.375"));

    // Reverts on overflow
    assert(await didContractThrow(fixedPoint.wrapPow(web3.utils.toWei("10"), "60")));
  });
});