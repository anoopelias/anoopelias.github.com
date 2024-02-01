---
layout: post
title: "Fragment specifiers in Rust Macros"
categories: tech
author: Anoop Elias
date: "2024-02-05"
---

Rust macros seemed like an enigma when I first saw it, but once I started understanding it a bit, it's not all that bad!

"Fragment specifiers" are what you see as the "type" of an argument that you might see in the invocation of the macro. The most common being `expr`. Like below,

```
macro_rules! add_two_numbers {
    ($num1:expr, $num2:expr) => {
        $num1 + $num2
    };
}
fn main() {
    let _result = add_two_numbers!(1, 2);
}
```

Note that the call ends with `!` like `add_two_numbers!` which tells us this is a macro invocation.

Before we delve into all the other fragment specifiers, let us quickly see what is a Rust macro and when to use it.

## What is a Rust macro?

Rust macros are pre-processors. Essentially it allows us to add/change code at compile time. This process is called "macro expansion". If we are to get the rust compiler to expand the above code, it will look like,

```
#![feature(prelude_import)]
#[prelude_import]
use std::prelude::rust_2021::*;
#[macro_use]
extern crate std;
macro_rules! add_two_numbers {
    ($num1:expr, $num2:expr) => { $num1 + $num2 };
}
fn main() { let _result = 1 + 2; }
```

(Please ignore the first few lines, it is something that the Rust compiler adds)

The concept of Rust macro is similar to that of one in C, in the sense that it is a pre-processor, however they both differ fundamentally in implementation.

![](/posts/macro-expansion.png)

Macro expansion in C happens on tokens, while in Rust, it happens on the AST! This makes the rust implementation a tad bit harder to understand and use, however that makes it more powerful! We'll see,

## When to use Rust macro?

As you thought, the example code I gave above (`add_two_numbers`) - we could achieve the same using a function as well. Personally, I have seen at least two cases where Rust macro might be useful over a function,

- Variable number of args. Rust functions do not support this feature, so instead, we need to use a macro. The most common example is the `println!` macro.

```
let name = "foo";
println!("Hello {}", name);
```
- When we want to have the same implementation for multiple types. For example, see [this](https://github.com/anoopelias/wasmrepl/blob/1d77fe6b175db1bd89f5011e1be424c526c97952/src/value.rs#L55). This way we can avoid creating enums/traits, thereby simplifying it for the client, all the while not duplicating the code as well.

I am sure there _are_ more. If you happen to know, please let me know!

## Fragment Specifiers

"Fragment specifiers" is the technical name used for the type annotation of argument. At times I have seen Fragment Specifiers also referred to as "Token Types". Let us go through one by one and see examples of each of them,

**Protip:** To see how these macros expand, you can copy and paste this code into [Rust Playground](https://play.rust-lang.org/) and choose "TOOLS > Expand macros".

### `expr`

Expression example

```
macro_rules! is_even {
    ($num:expr) => (
        match $num % 2 {
            0 => true,
            1 => false,
            _ => unreachable!()
        }
    );
}
fn main() {
    let _result = is_even!(20 + 5);
}
```

### `ident`

An example of an identifier using a macro,

```
macro_rules! create_function {
    ($func_name:ident) => {
        fn $func_name() {
            println!("Hello from function: {}", stringify!($func_name));
        }
    };
}

fn main() {
    create_function!(greet_world);
    create_function!(say_hello);

    greet_world();
    say_hello();
}
```

The values can be function names, variable names, struct names, etc. See many more [examples](https://github.com/anoopelias/wasmrepl/blob/1d77fe6b175db1bd89f5011e1be424c526c97952/src/handler.rs#L268) in action.

### `item`

An item is a root-level object like modules, structs, traits, functions, impl blocks, use declarations, etc. Let us look at an example with `struct`,

```
macro_rules! customize {
    ($struct:item) => {
        #[derive(Debug)]
        $struct
    };
}

customize! {
    struct Coord {
        x: i32,
        y: i32,
    }
}

fn main() {
    let coord = Coord { x: 3, y: 6 };
    println!("coord: {:?}", coord);
}
```

### `stmt`

Statements are different from Expressions in the sense that they will produce a side effect, do not necessarily have to return anything, or rather the returned value is ignored. An example of a macro using Statement below,

```
macro_rules! repeat_statement {
    ($stmt:stmt, $count:expr) => {
        for _ in 0..$count {
            $stmt
        }
    };
}

fn main() {
    repeat_statement!(println!("This statement is repeated!"), 3);
}
```

### `block`

Blocks are lines of code wrapped in curly braces (`{}`). At the same time, they are expressions as well. Like below,

```
use rand::Rng;

macro_rules! rand_block {
    ($block1:block, $block2:block) => {
        {
            let n: u8 = rand::thread_rng().gen();
            if n % 2 == 0 $block1
            else $block2
        }
    };
}

fn main() {
    let (num1, num2): (i32, i32) = (9, 10);
    let result = rand_block!(
        {
            println!("Executing first block");
            num1
        },
        {
            println!("Executing second block");
            num2
        }
    );

    println!("Result: {}", result);
}
```

### `ty`

In this example, we can pass a particular type to the macro, and generate code based on the type, like,

```
macro_rules! create_struct {
    ($struct_name:ident, $field_type:ty) => {
        struct $struct_name {
            value: $field_type,
        }
    };
}

fn main() {
    create_struct!(IntegerStruct, i32);
    create_struct!(FloatStruct, f64);

    let _int_instance = IntegerStruct { value: 10 };
    let _float_instance = FloatStruct { value: 3.14 };
}
```

### `path`

There could be other use cases, but I found "Path" is particularly useful when you want to pass an enum _value_ to the macro. See below,

```
enum Value {
    I32(i32),
    I64(i64),
}

macro_rules! map_num_types {
    ($type:ty, $enum:path) => {
        impl From<$type> for Value {
            fn from(n: $type) -> Self {
                $enum(n)
            }
        }
    };
}

map_num_types!(i32, Value::I32);
map_num_types!(i64, Value::I64);

fn main() {
    let _i32_value: Value = 2.into();
    let _i64_value: Value = 3.into();
}
```

### `pat`

With this, we can pass a pattern to a macro which can be used as an arm of a match expression. For example,

```
macro_rules! assert_match {
    ($exp:expr, $pattern:pat) => {
        match $exp {
            $pattern => {}
            _ => panic!("Failed match"),
        }
    }
}

fn main() {
    let value = 5;
    assert_match!(value, 3 | 5 | 7);
}
```

### `pat-param`

When `:pat` was introduced first, it didn't match against `|` so you can have a pattern separator like `$pattern1 | $pattern2`. However, a breaking change was introduced in Rust 2021 to allow `:pat` to match the pipe inside it. Thereby not allowing a pipe separator after `:pat`. So, to be able to use a pipe as a macro argument separator, we need to use `:pat-param`. See [this](https://doc.rust-lang.org/edition-guide/rust-2021/or-patterns-macro-rules.html) for more details. Sample code below,

```
macro_rules! assert_match {
    ($exp:expr, $pattern1:pat_param | $pattern2:pat) => {
        match $exp {
            $pattern1 => {
                println!("Pattern 1 match");
            }
            $pattern2 => {
                println!("Pattern 2 match");
            }
            _ => panic!("Failed match"),
        }
    }
}

fn main() {
    let value = 2;
    assert_match!(value, 1 | 2);
}
```

### `meta`

Meta specifier is used to send `#[xxx]` type attributes to the macro. Let us extend our `create_struct` to support attributes as well,

```
macro_rules! create_struct {
    ($struct_name:ident, $field_type:ty) => {
        struct $struct_name {
            value: $field_type,
        }
    };

    ($struct_name:ident, $field_type:ty, $($meta:meta),*) => {
        $(#[$meta])*
        struct $struct_name {
            value: $field_type,
        }
    };
}

fn main() {
    create_struct!(IntegerStruct, i32);
    create_struct!(FloatStruct, f64, derive(Debug));

    let _int_instance = IntegerStruct { value: 10 };
    let _float_instance = FloatStruct { value: 3.14 };
}
```

### literal

We can use a Literal specifier if we want to ensure that the macro invocation uses a literal instead of an expression or variable.

```
struct Config {
    host: &'static str,
}

macro_rules! create_config {
    ($host:literal) => {
        Config { host: $host }
    };
}

fn main() {
    let config = create_config!["127.0.0.1"];
}
```

Compilation will fail even if we use a variable that holds a string literal.
```
fn main() {
    let host = "127.0.0.1";

    // Compilation Fail : no rules expected this token in macro call
    let config = create_config![host];
}
```

### `vis`

This specifier can be used to pass a visibility modifier to the macro. Like `pub` or `pub(crate)` or even nothing! Let us use this to extend our `create_struct!` macro,

```
macro_rules! create_struct {
    ($access:vis $struct_name:ident, $field_type:ty) => {
        $access struct $struct_name {
            value: $field_type,
        }
    };
}

fn main() {
    create_struct!(pub IntegerStruct, i32);
    create_struct!(FloatStruct, f64);

    let _int_instance = IntegerStruct { value: 10 };
    let _float_instance = FloatStruct { value: 3.14 };
}
```

### `lifetime`

A lifetime fragment specifier is useful when you want to pass an existing lifetime into a macro. For example, you want to create an `impl` function on a type that has a lifetime parameter. Like below,

```
macro_rules! create_fn_new {
    ($lt:lifetime, $field_type:ty) => {
        fn new(num: &$lt $field_type) -> Self {
            Self {
                value: num
            }
        }
    };
}

struct IntegerStruct<'a> {
    value: &'a i32
}

impl<'a> IntegerStruct<'a> {
    create_fn_new! {'a, i32}
}

fn main() {
    let _instance = IntegerStruct::new(&10);
}
```

### `tt`

Also called a Token Tree, this is the most flexible of all fragment specifiers. A token tree is anything that wraps in a `()`, `{}`, or `[]`. Or it can be a _single_ token. The catch is then we cannot use this macro argument where some of the fragment specifier type rules are applicable. It is still possible to use Token Tree for many of the examples we mentioned above, but for example, we cannot use `tt` type argument as the arm of a `match`, we definitely need [`pat`](#pat) for that.

With flexibility comes responsibility, so be diligent in using this specifier. Avoid it as much as possible to catch your errors early and in the right places.

One particular example where I found Token Tree is useful is,

```
macro_rules! my_println {
    ($($arg:tt)*) => {
        use std::io::Write;
        std::io::stdout().write(format!($($arg)*).as_bytes());
    };
}
fn main() {
    my_println!("{} {}", "foo", "bar");
}
```

## Conclusion

While we talked about the arguments to a macro, we didn't discuss much about the type of return values. In general, the returns of a macro should be compatible with the exact position where the macro is invoked. We did touch a few of those, for example in [`expr`](#expr) example, the macro returns an Expression as well, and in [`ident`](#ident) example, the macro returns an Item. Maybe we can write another blog covering this.

So that was a summary of all the Fragment Specifiers that Rust supports as of today. There were a few macro features like [Internal Rules](https://veykril.github.io/tlborm/decl-macros/patterns/internal-rules.html) which we left out intentionally, but if you are interested I strongly recommend [The Little Book of Rust Macros](https://veykril.github.io/tlborm/introduction.html).

All the code in this blog was tested using [Rust Playground](https://play.rust-lang.org/). If you feel something is not right, please feel free to drop an email.

Thanks for reading!

