---
layout: post
title: "WASM Micro Runtime with Rust"
categories: tech
author: Anoop Elias
date: "2023-07-30"
---

Traditionally, microcontrollers are known to be able to run only C code. Firmware developers will usually have an Eclipse-based IDE as well as a custom compiler toolchain to compile the code against the  target. This has been changing a lot. For example, [MicroPython](https://micropython.org/) has become popular recently. RaspberryPi Pico, ExpressIf's ESP32 are some microcontrollers that have fairly good support for MicroPython. See antirez's [talk32](https://github.com/antirez/talk32) project, which attempts to improve the MicroPython tooling and developer workflow for ESP32.

Anyway!

Running [Web Assembly](https://webassembly.org/) (WASM) binary _outside_ of browser context [is not unheard of](https://github.com/bytecodealliance/wasmtime). What if, instead of Python, we could run WASM binaries over a runtime on microcontrollers? That would mean that we can use programming languages like C++, Rust, Go etc. for microcontroller programming! As a bonus, we get the security and flexibility of the WASM sandbox too.

Built by the Bytecode Alliance, the [WASM Micro Runtime](https://github.com/bytecodealliance/wasm-micro-runtime) (aka WAMR) is a step in that direction. In this post, we attempt to run a Rust-generated WASM binary over an ESP32 board using WAMR.

Just to be clear, this is what we are talking about,

![](/posts/esp32-architecture.png)

All the code samples shared in this post are available as fully working code in [this](https://github.com/anoopelias/hello-wasm-esp32) GitHub repo.

## Hardware

I used an [ESP32 development board](https://robocraze.com/products/nodemcu-32-wifi-bluetooth-esp32-development-board30-pin). Also, I used a RaspberryPi 3B as the compiler and host. There is no particular reason to use RaspberryPi, It's just because I had one, and I wanted to use it. Any Windows/Linux/Mac would have been sufficient.

Here is the entire setup (pretty simple, I would say):

![](/posts/esp32-pi.jpg)


## Software

- Install ExpressIf's ESP-IDF toolchain. This is needed to compile anything that could run on an ESP32. [Here](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/linux-macos-setup.html) are the instructions that I followed.
- Clone [`wasm-micro-runtime`](https://github.com/bytecodealliance/wasm-micro-runtime) and set its root as `$WAMR_PATH`.
- The libc API needed for system calls is provided by [`wasi-sdk`](https://github.com/WebAssembly/wasi-sdk). We need to install this in the environment as `$WASI_SDK_PATH` so that we can compile the C code to WASM using Clang. However, this is not separately needed for Rust, it ships with rustup's `wasm32-wasi` target.

## Running C "Hello World!"

WAMR already has a [sample `Hello World!` program](https://github.com/bytecodealliance/wasm-micro-runtime/tree/main/product-mini/app-samples/hello-world) compiled for WASM. Let us use the same approach and get it running.

### Compile C to WASM
Let's first take this simple C program, compile it to WASM, and try to run it.

```
#include <stdio.h>

int main(int argc, char **argv)
{
    printf("Hello clang world!\n");
    return 0;
}
```

To compile this, we will use the [same approach](https://github.com/bytecodealliance/wasm-micro-runtime/blob/6110ea39fdcb9e86683213b6036c2787c0b9e9a5/product-mini/app-samples/hello-world/build.sh#L7) as in the sample provided by WAMR.

This will create a `test.wasm`.
```
$ $WASI_SDK_PATH/bin/clang -O3 \
        -z stack-size=4096 -Wl,--initial-memory=65536 \
        -o test.wasm main.c \
        -Wl,--export=main -Wl,--export=__main_argc_argv \
        -Wl,--export=__data_end -Wl,--export=__heap_base \
        -Wl,--strip-all,--no-entry \
        -Wl,--allow-undefined \
        -nostdlib
```

Now, since WAMR do not have file system support over ESP32, we have to convert it into a byte array and include it in the ESP32 build. We can create the `binarydump` executable that was created in the example project.
```
$ binarydump -o test_wasm.h -n wasm_test_file_interp test.wasm
```

This will create a `test_wasm.h` in array format, which we can include in the ESP build.

### Build ESP32 binary and flash

Now, for this bit, we will copy pretty much everything from the WAMR ESP-IDF sample project from [`product-mini/platforms/esp-idf`](https://github.com/bytecodealliance/wasm-micro-runtime/tree/ada7e3fe881473818789c9a5d4c38e7ff0bf4054/product-mini/platforms/esp-idf) folder. Once duplicated, we can simplify a few things.

The `main/main.c` has elaborate support over AOT<sup>*</sup> as well, which we can remove for the moment. Everything else remains the same. Since this is a large file for a sample code in a blog post, and we are not investigating its content at the moment, I will link to the file from my repo [here](https://github.com/anoopelias/hello-wasm-esp32/blob/a4ced6be7a668fd432f9373f7180fe64163b2e37/main/main.c).

Also, the `build_and_run.sh` can be simplified as,

```
#!/bin/bash -e
rm -rf build
idf.py set-target "esp32"
idf.py build
idf.py flash
```

Now, we need to bring `idf.py` into the path,

```
$ source $IDF_PATH/export.sh
```

And then we run,

```
$ ./build_and_run.sh
```

Once this execution is complete (which will take 3 to 4 minutes), if we look at the logs with `idf.py monitor` command, we can see the `Hello World!` printed.

```
...
...
I (344) cpu_start: Starting scheduler on PRO CPU.
I (0) cpu_start: Starting scheduler on APP CPU.
I (0) wamr: Initialize WASM runtime
I (10) wamr: Run wamr with interpreter
I (10) wamr: Instantiate WASM runtime
I (10) wamr: run main() of the application
Hello clang world!
I (20) wamr: Deinstantiate WASM runtime
I (20) wamr: Unload WASM module
I (30) wamr: Destroy WASM runtime
I (415) wamr: Exiting...
```

And that brings us to the current state of the art, as given by the WAMR's sample esp-idf project.

## Running Rust "Hello World!"

Let's start with a simple `Hello World!`,

```
fn main() {
    println!("Hello Rust World!");
}
```

To compile this to WASM, we need `wasm32-wasi` target. Let's add that,

```
$ rustup target add wasm32-wasi
```

And then let's compile,

```
$ rustc --target wasm32-wasi main.rs
```

Which will generate a `main.wasm`. Hmm.. Was it that easy? I wish. 😃 The problem is the size of the wasm binary.

```
$ ls -alh main.wasm
-rwxr-xr-x@ 1 anoopelias  staff   2.0M Jul 27 21:42 main.wasm
```

Just for comparison, the size of the wasm binary generated from C code in the previous section is,

```
$ ls -alh test.wasm
-rwxr-xr-x@ 1 anoopelias  staff   173B Jul 27 21:54 test.wasm
```

A mere `173B` for C, while a whopping `2.0M` for a Rust WASM binary. Something is off! Something as small as an ESP32 board will not be able to handle a 2MB WASM binary. Believe me, I tried!

### `no_std`

You folks might have guessed by now, the problem is the _standard libarary of rust_. The entire `std` library is included in the WASM binary, which causes it to blow up in size. If you carefully noticed, when we compiled the C file, we had a `-nostdlib`. Can we do the same with Rust?

But `println!` is from `std` lib! Let's get rid of it just for a second.

```
#![no_std]

fn main() {}
```

```
$ rustc --target wasm32-wasi main.rs
error: `#[panic_handler]` function required, but not found

error: aborting due to previous error
```

Usually provided by the stdlib, Rust needs a panic handler available at all times. Typical Rust!

### `panic_handler`

Let's add a panic handler, thankfully, the `PanicInfo` struct is from `core` lib.

```
#![no_std]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

fn main() {}
```

```
$ rustc --target wasm32-wasi main.rs
error: requires `start` lang_item

error: aborting due to previous error
```

This error is because, again, `std` provides the startup bit as well, which also disappeared as a part of `no_std`. 

### `no_main`, `no_mangle`
Let's just do a `#![no_main]` as well. The WASM runtime will figure out the main function and run it as long as we don't allow `rustc` to mangle with it. So, `no_main` and `no_mangle`!
```
#![no_std]
#![no_main]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

#[no_mangle]
fn main() {}
```

```
$ rustc --target wasm32-wasi main.rs
$ ls -alh main.wasm
-rwxr-xr-x@ 1 anoopelias  staff   425B Jul 28 17:44 main.wasm
```

Great, we have a `main.wasm` file now that is only `425B`.

Let's expand it into [wat format](https://webassembly.github.io/spec/core/text/index.html) to see what is inside. We can use [wabt](https://github.com/WebAssembly/wabt) tool for this.

```
$ wasm2wat main.wasm
(module
  (type (;0;) (func (result i32)))
  (type (;1;) (func))
  (type (;2;) (func (param i32)))
  (import "env" "__main_void" (func $__main_void (type 0)))
  (import "env" "__wasm_call_dtors" (func $__wasm_call_dtors (type 1)))
  (import "env" "__wasi_proc_exit" (func $__wasi_proc_exit (type 2)))
  (func $__wasm_call_ctors (type 1))
  (func $_start (type 1)
    (local i32)
    block  ;; label = @1
      block  ;; label = @2
        i32.const 0
        i32.load offset=1048576
        br_if 0 (;@2;)
        i32.const 0
        i32.const 1
        i32.store offset=1048576
        call $__wasm_call_ctors
        call $__main_void
        local.set 0
        call $__wasm_call_dtors
        local.get 0
        br_if 1 (;@1;)
        return
      end
      unreachable
      unreachable
    end
    local.get 0
    call $__wasi_proc_exit
    unreachable)
  (func $main (type 1)
    return)
  (table (;0;) 1 1 funcref)
  (memory (;0;) 17)
  (global (;0;) (mut i32) (i32.const 1048576))
  (export "memory" (memory 0))
  (export "_start" (func $_start))
  (export "main" (func $main)))
```

This is still exporting an additional `_start` function, which is unwanted. We only need to export `main` to enable WAMR to execute it. It looks like this is coming from `wasm32-wasi/lib/self-contained/crt1-command.o` added during link time.

How do I know? Well, I spent a lot of time looking at how the `test.wasm` in C is compiled and how it gained the compact size.

### `link-self-contained=no`, `--no-entry`

Sending a couple of linker flags should avoid linker to insert the "self-contained" binary. Full command below (no change in `main.rs`),

```
$ rustc -C link-self-contained=no \
    -C link-args=--no-entry \
    --target wasm32-wasi main.rs
$ ls -alh main.wasm
-rwxr-xr-x@ 1 anoopelias  staff   142B Jul 28 22:13 main.wasm
$ wasm2wat main.wasm
(module
  (type (;0;) (func))
  (func $main (type 0)
    return)
  (memory (;0;) 16)
  (global (;0;) (mut i32) (i32.const 1048576))
  (export "memory" (memory 0))
  (export "main" (func $main)))
```

Cool, `142B`!. Good enought for now, it's ready to be tested. (Remember, we omitted the `println!`, so expect no output yet.)

To run this, like before, we need to convert the `main.wasm` to an array using `binarydump` and then run the same `build_and_run.sh` before,

```
$ ./binarydump -o main/test_wasm.h -n wasm_test_file_interp main.wasm
$ ./build_and_run.sh
```

And with `idf.py monitor`, we get an error,

```
...
...
I (10) wamr: Run wamr with interpreter
I (10) wamr: Instantiate WASM runtime
E (10) wamr: Error while instantiating: WASM module instantiate failed: allocate memory failed
I (20) wamr: Unload WASM module
I (30) wamr: Destroy WASM runtime
I (414) wamr: Exiting...
```

Why `allocate memory failed`? Again, I had to dig through a bit, this is somewhat related to the initial value of `global` stack pointer mentioned in the wat file above. Here is my understanding of the problem,

![](/posts/esp32-memory-model.png)

The stack pointer is initialized at the high end of the stack memory. The [Rust compiler default stack size](https://github.com/rust-lang/rust/blob/2e0136a131f6ed5f6071adf36db08dd8d2205d19/compiler/rustc_target/src/spec/wasm_base.rs#L12) is `1MB` while, for esp32, [we initialized it](https://github.com/anoopelias/hello-wasm-esp32/blob/ff8e5d961194a55309d4de87a9bd42bc5b6f27a6/main/main.c#L67) as `32kB`.

### `-zstack-size`

Let us tell the linker that we have only `32kB` stack,

```
$ rustc -C link-self-contained=no \
    -C link-args=--no-entry \
    -C link-args=-zstack-size=32768 \
    --target wasm32-wasi main.rs
$ wasm2wat main.wasm
(module
  (type (;0;) (func))
  (func $main (type 0)
    return)
  (memory (;0;) 1)
  (global (;0;) (mut i32) (i32.const 32768))
  (export "memory" (memory 0))
  (export "main" (func $main)))
```

Cool, the stack pointer is updated at offset `32768`, so let's try to run this.

Again, same drill as before, and,

```
...
...
I (0) cpu_start: Starting scheduler on APP CPU.
I (0) wamr: Initialize WASM runtime
I (10) wamr: Run wamr with interpreter
I (10) wamr: Instantiate WASM runtime
I (10) wamr: run main() of the application
I (20) wamr: Deinstantiate WASM runtime
I (20) wamr: Unload WASM module
I (30) wamr: Destroy WASM runtime
I (414) wamr: Exiting...
```

Phew!, no errors, looks like the file ran successfully.

We're still missing the `Hello World!`. Here is the deal: the `println!` macro is from `std` lib, which, if we take all of it, then it's going to be a huge WASM file. I am _not_ aware of a way to include _only_ the `println!` and its dependencies, and remove the rest of it.

### `puts` from C

An alternative workaround I borrowed from the C implementation is to call an `unsafe` C `puts` function,

```
#![no_std]
#![no_main]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

extern "C" {
    fn puts(input: *const u8) -> i32;
}

#[no_mangle]
fn main() {
    let hello = "Hello Rust World!";
    let hello_ptr: *const u8 = hello.as_ptr() as *const u8;

    unsafe {
        puts(hello_ptr);
    }
}
```
Is there a better way to do this? Let me know.

Anyway, if we compile and run this, we get,
```
...
...
I (0) cpu_start: Starting scheduler on APP CPU.
I (0) wamr: Initialize WASM runtime
I (10) wamr: Run wamr with interpreter
I (10) wamr: Instantiate WASM runtime
I (10) wamr: run main() of the application
Hello Rust World!
I (20) wamr: Deinstantiate WASM runtime
I (20) wamr: Unload WASM module
I (30) wamr: Destroy WASM runtime
I (415) wamr: Exiting...
```
A well-deserved `Hello World!`.

## Conclusion

We were able to run a Rust-compiled WASM over ESP32 using WAMR. While the approach presented here is not a _solid_ solution for running Rust WASM over microcontrollers, [`wasm-micro-runtime`](https://github.com/bytecodealliance/wasm-micro-runtime) is a promising initiative. With some work and some time, we will be able to look at running Rust and WASM on microcontrollers in production.

It has been an incredible learning experience to get this to work. I am looking forward to learning more about Rust, WASM, and microcontrollers.

Thanks for reading. Again, all the code discussed in this post is available in the GitHub repo [here](https://github.com/anoopelias/hello-wasm-esp32). Let me know your thoughts, please feel free to open an issue in the GitHub repo with your comments.

---

**Credits**: [Excalidraw](https://excalidraw.com/)

\* AOT or Ahead-of-Time compilation, is a WASM feature that WAMR can support. This means the `*.wasm` file will be compiled specific to the target; however, this improves the efficiency of WASM execution by a significant margin. We might explore this idea in a future post.