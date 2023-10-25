---
layout: post
title: "Introduction to WebAssembly"
categories: tech
author: Anoop Elias
date: "2023-10-25"
---

I had some experience with [Clojure](https://clojure.org/) sometime back, those folks will teach Clojure extensively over REPL. I felt that the Lisp-like format is well suited for REPL-driven development. And when I saw the [WebAssembly (Wasm)  text format](https://webassembly.github.io/spec/core/text/index.html) - which is very much a Lisp-based format - I thought, why not?

So here I am, showing off my REPL for Wasm - [wasmrepl](https://github.com/anoopelias/wasmrepl) - to talk about a few Wasm instructions and show how it works.

## Caveats

Before we proceed further, few things to call out,

- This REPL is not strictly built according to Wasm spec. Some rules are relaxed to make it easy to use within a REPL prompt. For example, the prompt acts as the _inside_ of a Wasm `func`, so you can do, say an `(i32.const 12)`. However, unlike the inside of a Wasm `func`, you can also define a new `func` on the prompt.
- We don't have full coverage of all features of Wasm yet. What is covered is documented [here](https://github.com/anoopelias/wasmrepl/blob/main/Features.md). If you would like to see a particular feature implemented, please feel free to open an [issue](https://github.com/anoopelias/wasmrepl/issues). Or a PR.

Now that is out of the way,

## How to install `wasmrepl`

This is built as Rust's cargo-based binary, so,

```
$ cargo install wasmrepl
```

And then,

```
$ wasmrepl
>> 
```

To exit the prompt, use `CTRL-D`.

## Numeric instructions

### Integer operations

Let's try some simple numeric instructions,

```
>> (i32.const 12)
[12]
>>
```

WebAssembly (abbreviated Wasm) is a binary instruction format for a stack-based virtual machine [[ref](https://webassembly.org/)]. As soon as an instruction is executed, the REPL will print the current stack. Let us insert one more,

```
>> (i32.const 18)
[12, 18]
>>
```

Now that there are two values in the stack, let us add them together,

```
>> (i32.add)
[30]
>>
```

We can use the `drop` instruction to remove value from the stack as well,

```
>> (drop)
[]
>> 
```

Let's do a few more instructions,

```
>> (i32.const 15) (i32.const 12)
[15, 12]
>> (i32.sub)
[3]
>> (i32.const 15) (i32.mul)
[45]
>> (i32.const 3) (i32.div_s)
[15]
>> (drop)
[]
>>
```

You noticed the `_s` in `div_s`! Let us talk a little bit about signed and unsigned operations,

While Wasm allows only signed values on the stack (i32, i64, f32 & f64), it still allows unsigned operations. Unsigned operations are essentially an operation assuming both the values in the stack are 'unsigned bit representations' of the value. For example, if we insert `-1` (i32) into the stack, the unsigned operation will assume it is `4294967295` (`0xFFFFFFFF`)

To prove the difference, let us take the value `0x80000000`. If this value is considered signed, then its value will be `-214783648`. If it is unsigned, then the value will be `214783648`. A signed division and an unsigned division of the same number will give different values as below,

```
>> (i32.div_s (i32.const 0x80000000) (i32.const 2))
[-1073741824]
>> (drop)
[]
>> (i32.div_u (i32.const 0x80000000) (i32.const 2))
[1073741824]
>> (drop)
[]
>>
```

Again you might have noticed, the concise form. Meaning, the following two sets of instructions are _exactly_ same.

```
(i32.<op> (i32.const x) (i32.const y))
```

```
(i32.const x)
(i32.const y)
(i32.<op>)
```

Similar to `div`, a `rem` (reminder) operation also works for both signed and unsigned numbers,

```
>> (i32.rem_s (i32.const 10) (i32.const 3))
[1]
>> (drop)
[]
>> (i32.rem_s (i32.const 10) (i32.const -3))
[1]
>> (drop)
[]
>> (i32.rem_u (i32.const 10) (i32.const -3))
[10]
>> (drop)
[]
>> 
```

Now let's look at bitwise operations. These will work how you would expect it to,

```
>> (i32.and (i32.const 9) (i32.const 7))
[1]
>> (i32.or (i32.const 8) (i32.const 7))
[1, 15]
>> (i32.xor (i32.const 9) (i32.const 7))
[1, 15, 14]
>> (drop) (drop) (drop)
[]
>> 
```

And the shifts, (obviously the 'right shift' can be 'signed' or 'unsigned'),

```
>> (i32.shl (i32.const 1) (i32.const 2))
[4]
>> (i32.shr_s (i32.const 2))
[1]
>> (drop)
[]
>> (i32.shr_s (i32.const -2) (i32.const 1))
[-1]
>> (i32.shr_u (i32.const -2) (i32.const 1))
[-1, 2147483647]
>> (drop) (drop)
[]
```

And rotations too,

```
>> (i32.rotl (i32.const 0x80000001) (i32.const 1))
[3]
>> (i32.rotr (i32.const 1))
[-2147483647]
>> (drop)
[]
>>
```

Other types of instructions are comparison instructions,

```
>> (i32.eq (i32.const 5) (i32.const 2))
[0]
>> (i32.eq (i32.const 5) (i32.const 5))
[0, 1]
>> (drop drop)
[]
>> (i32.ne (i32.const 5) (i32.const 2))
[1]
>> (i32.ne (i32.const 5) (i32.const 5))
[1, 0]
>> (drop drop)
[]
>> 
```

There are 'less than' and 'greater than' comparisons too, these have both 'signed' and 'unsigned' versions available,

```
>> (i32.lt_s (i32.const 4) (i32.const 5))
[1]
>> (i32.lt_s (i32.const 6) (i32.const 5))
[1, 0]
>> (drop drop)
[]
>> (i32.lt_s (i32.const 0xFFFFFFFF) (i32.const 0))
[1]
>> (i32.lt_u (i32.const 0xFFFFFFFF) (i32.const 0))
[1, 0]
>> (drop drop)
[]
>> (i32.gt_s (i32.const 4) (i32.const 5))
[0]
>> (i32.gt_s (i32.const 6) (i32.const 5))
[0, 1]
>> (drop drop)
[]
>> (i32.gt_s (i32.const 0xFFFFFFFF) (i32.const 0))
[0]
>> (i32.gt_u (i32.const 0xFFFFFFFF) (i32.const 0))
[0, 1]
>> (drop drop)
[]
>> 
```

Also, there is 'less than or equal' and 'greater than or equal' instructions as well,

```
>> (i32.le_s (i32.const 4) (i32.const 5))
[1]
>> (i32.le_s (i32.const 5) (i32.const 5))
[1, 1]
>> (i32.le_s (i32.const 6) (i32.const 5))
[1, 1, 0]
>> (drop drop drop)
[]
>> (i32.ge_s (i32.const 4) (i32.const 5))
[0]
>> (i32.ge_s (i32.const 5) (i32.const 5))
[0, 1]
>> (i32.ge_s (i32.const 6) (i32.const 5))
[0, 1, 1]
>> (drop drop drop)
[]
```

Skipping the unsigned formats `le_u` and `ge_u`, leaving it to you to guess how it will behave!

There is a test operation, which is essentially a logical negation,

```
>> (i32.const 4)
[4]
>> (i32.eqz)
[0]
>> (i32.eqz)
[1]
>> (drop)
[]
>> 
```

A few more single-argument operations,

```
>> (i32.clz (i32.const 0x08000000)) ;; count leading zeros
[4]
>> (i32.ctz (i32.const 0x08000000)) ;; count trailing zeros
[4, 27]
>> (i32.popcnt (i32.const 0x08000001)) ;; count ones
[4, 27, 2]
>> (drop drop drop)
[]
>>
```

The operations on `i64` are exactly the same as those of `i32` only difference is bit width. Just for a couple of examples,

```
>> (i64.add (i64.const 4) (i64.const 6))
[10]
>> (drop)
[]
>> (i64.rotl (i64.const 0x8000000000000001) (i64.const 1))
[3]
>> (drop)
[]
>>
```

### Floating point operations

In floating point, Wasm does not support 'unsigned' operations. Let's start with basic arithmetic ones,

```
>> (f32.add (f32.const 1.5) (f32.const 2.5))
[4]
>> (f32.sub (f32.const 2.5) (f32.const 1.25))
[4, 1.25]
>> (f32.mul (f32.const 1.5) (f32.const 2.5))
[4, 1.25, 3.75]
>> (f32.div (f32.const 3.75) (f32.const 2.5))
[4, 1.25, 3.75, 1.5]
>> (drop drop drop drop)
[]
>>
```

We can do `min` and `max` in floats,

```
>> (f32.min (f32.const 1.5) (f32.const 3.5))
[1.5]
>> (f32.max (f32.const 1.5) (f32.const 3.5))
[1.5, 3.5]
>> (drop drop)
[]
>> 
```

Comparison operations in floats,

```
>> (f32.eq (f32.const 1.5) (f32.const 1.5))
[1]
>> (f32.ne (f32.const 1.5) (f32.const 1.5))
[1, 0]
>> (drop drop)
[]
>> (f32.lt (f32.const 1.5) (f32.const 2.5))
[1]
>> (f32.gt (f32.const 1.5) (f32.const 2.5))
[1, 0]
>> (drop drop)
[]
>> (f32.le (f32.const 1.5) (f32.const 2.5))
[1]
>> (f32.ge (f32.const 1.5) (f32.const 2.5))
[1, 0]
>> (drop drop)
[]
>> 
```

If we want to copy the sign of a number,

```
>> (f32.copysign (f32.const -8.0) (f32.const 5.0))
[8]
>> (f32.copysign (f32.const -8.0) (f32.const -5.0))
[8, -8]
>> (drop drop)
[]
>>
```

And some unary operations,

```
>> (f32.abs (f32.const -3.3))
[3.3]
>> (drop)
[]
>> (f32.neg (f32.const 3.3))
[-3.3]
>> (drop)
[]
>> (f32.ceil (f32.const 3.3))
[4]
>> (f32.floor (f32.const 3.3))
[4, 3]
>> (f32.nearest (f32.const 3.3))
[4, 3, 3]
>> (drop drop drop)
[]
>> (f32.sqrt (f32.const 2.0))
[1.4142135]
>> 
```

Again, similar to `i64`, `f64` operations are exactly the same as `f32` only difference being in bitwidth. Leaving these as well as an exercise for you to work out.

## Variable Instructions

We can define local variables and set and retrieve them. See examples below,

```
>> (local $num i32)
local ;0; num
[]
>> (local.set $num (i32.const 12))
[]
>> (local.get $num)
[12]
>> (local.get 0) ;; Use index
[12, 12]
>> (drop drop)
[]
>>
```

If you want to set the variable, but don't want to drop the stack tip, then there is a shorthand `local.tee`

```
>> (i32.const 13)
[13]
>> (local.tee $num)
[13]
>> (drop)
[]
>> (local.get $num)
[13]
>> (drop)
[]
>>
```

## Control flow instructions

These instructions allow us to change the control flow of the execution. Let's look at `if..then..else` and see how it works,

```
>> (i32.const 4) ;; input to the block
[4]
>> (i32.const 1) ;; condition
[4, 1]
>> (if (param i32) (result i32)
     (then (i32.const 3) (i32.mul))
     (else (i32.const 5) (i32.add))
)
[12]
>> (drop)
[]
>> (i32.const 4)
[4]
>> (i32.const 0) ;; Try again, with else block
[4, 0]
>> (if (param i32) (result i32)
     (then (i32.const 3) (i32.mul))
     (else (i32.const 5) (i32.add))
)
[9]
```

In both cases, the `if` block takes one parameter (`4` in both cases) and spits out a single value as result. Based on current tip of the stack (`1` or `0`), it chooses the `then` block or `else` block. In `then` block, it multiplies the input by `3`, while in `else` block, it adds `5`. Hence it gives `12` and `9` respectively in both these operations.

Lets look at another construct, `block`. Similar to `if` the block is bound by its `param`s and `result`s,

```
>> (local $num i32)
local ;0; num
[]
>> (local.set $num (i32.const 10))
[]
>> (i32.const 5)
[5]
>> (block $b
    (param i32) (result i32)
    (local.get $num)
    (i32.eq (i32.const 10))
    (if (then br $b))
    (i32.mul (i32.const 3))
)
[5]
>> (drop)
[]
>> (local.set $num (i32.const 2)) ;; Try again without breaking
[]
>> (i32.const 5)
[5]
>> (block $b
    (param i32) (result i32)
    (local.get $num)
    (i32.eq (i32.const 10))
    (if (then br $b))
    (i32.mul (i32.const 3))
)
[15]
>> (drop)
[]
>>
```

When a block hits a branch (`br`) statement of a `block`, it exits the block.

Let's look at `loop` as well for the full picture,

```
>> (local $i i32)
local ;0; i(i32.const 25)
[]
>> (local.set $i (i32.const 10)) ;; number of iterations
[]
>> (i32.const 25)
[25]
>> (loop $l
    (param i32) (result i32)

    (i32.mul (i32.const 2))

    (local.get $i)
    (i32.sub (i32.const 1))
    (local.tee $i)
    (if (then br $l))
)
[25600]
>> (drop)
[]
```

This is kind of analogous `block`, in the sense, that the branch (`br`) statement inside a loop will initiate the next iteration of the `loop` (unlike in `block` where it will exit the block).

## Functions

Functions are essentially blocks but with their own context of local variables and can be `call`ed at whim!

A sample function below,

```
>> (func $sq
    (param i32) (result i32)

    (local.get 0)
    (local.get 0)
    (i32.mul)
)
func ;0; sq
>> (call $sq (i32.const 12))
[144]
>>
```

Functions with explicit return can ignore additional values on the stack apart from return values,

```
>> (func $sq
    (param i32) (result i32)

    (i32.const 3) ;; No reason to have this here, just to prove the point.

    (local.get 0)
    (local.get 0)
    (return (i32.mul))
)
func ;0; sq
>> (call $sq (i32.const 12))
[144]
>>
```

## Conclusion

That was a brief overview of some of the Wasm instructions. Please note that we have only covered what is possible in `wasmrepl` as of writing this post, that too is only a subset of it.

Any feedback, please open an issue [here](https://github.com/anoopelias/wasmrepl/issues). If this was helpful, let me know as well, maybe by 'star'ring the Github repo. We can follow up with another post on advanced Wasm concepts if this is useful for many.

Thanks for reading!