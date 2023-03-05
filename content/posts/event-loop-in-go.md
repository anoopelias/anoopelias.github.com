---
layout: post
title: "Event Loop in Go"
categories: tech
author: Anoop Elias
date: "2023-03-05"
---

“Single Threaded Even Loop” or simply “Event Loop” is a fairly well-known concept in the programming world. This concept was popularized early on by GUI frameworks and JavaScript engines running in browsers and later by Node.js as well. The important advantage of this construct is we can stop worrying about “thread safety” altogether. Thread safety comes for free because all you have is only one thread anyway.

Another great example of usage of a Single Threaded Event Loop is Redis. Redis commands run on Event Loop as well.

## What is an "Event Loop"?

I will try to explain this with an example that I read long back (I forgot where).

Assume our JavaScript code is King. The King has to meet several people over the day, take several decisions, send them to different tasks, and deal with them when they come back as well. Also, he meets each of them one by one only.

What if someone comes to meet the King but the King is already in a meeting? This person will wait in a queue outside the door of King's meeting room. As soon as a meeting is done, the first person in the queue can go into the meeting room.

I hope you are catching the drift here 😃, the below diagram should explain the concept.

![](/posts/event-loop.png)

- The JavaScript code we write is always waiting for an event to happen. Like the click of a button in the UI. 
- When the event happens, it gets queued, and will wait for it to be picked up.
- As soon as it is picked up, the JavaScript engine will find the part of the code that should receive that event, execute it, and be done with it. The code could emit new events if it would like.

Of course, as a downside of this approach, we had to deal with "callback hell". This got addressed to a certain extent over the years, first by `promise` and then by `async`/`await`.

## How to implement Event Loop in Go?

Or why would we? It's not that we implement a new JavaScript engine every other day. One reason I got interested in Event Loop is [CodeCrafters](https://app.codecrafters.io/tracks) challenges. In particular, their [Build your own Redis](https://app.codecrafters.io/courses/redis?track=go) challenge talks about using Event Loop implementation. If you happen to implement an Event Loop for a production use case, consider yourself lucky!

(BTW, I highly recommend CodeCrafters challenges)

Let's talk about implementing Event Loop for [Redis in Go](https://github.com/anoopelias/redis-go). Like almost everything else, there are several ways to implement an Event Loop with varying levels of benefits and caveats. Let's see,

### Using Goroutines

In this approach, we maintain one Goroutine for Event Loop. Assume this is _the_ single thread. All data updates happen in this thread. We will deal with receiving, parsing, and responding to TCP connections in a different Goroutine. Like below,

![](/posts/goroutine.png)

But you might say, "Oh.. that is not a single thread!". Please bear with me until we get to the bottom of this 😃.

For this kind of approach, the event loop on the main thread will look like this,

```
func loop(chcmd chan command) {
	dict := make(map[string]string)
	for {
		cmd := <-chcmd
		cmd.resp <- execute(cmd, dict)
	}
}
```
We are receiving the command in the command channel. As soon as we get a command, we execute it and send the response in the response channel - After which we will wait for the next command.

On the client Goroutine side, once we receive the command from the client, we send it in the command channel, and then wait for a response. Once we get a response we can write it back and then wait for the next request from the same client. Like below,
```
func handle(conn net.Conn, chcmd chan command) {
	r := bufio.NewReader(conn)
	for {
		c, err := readCommand(r)
		if err != nil {
			// Possibly because the client disconnected
			return
		}
		chcmd <- c
		resp := <-c.resp
		conn.Write([]byte("+" + resp + "\r\n"))
	}
}
```

We would need another Goroutine to accept connections from new clients and start their goroutine, like below,

```
func start(l net.Listener, chcmd chan command) {
	for {
		conn, err := l.Accept()
		if err != nil {
			fmt.Println("Error accepting connection: ", err.Error())
			panic(err)
		}
		go handle(conn, chcmd)
	}
}
```

And to tie them all together,
```
func main() {
	l, err := net.Listen("tcp", "0.0.0.0:6379")
	if err != nil {
		fmt.Println("Failed to bind to port 6379")
		panic(err)
	}
	fmt.Println("Accepting connections")
	chcmd := make(chan command)

	go start(l, chcmd)
	loop(chcmd)
}
```

A complete working code is available in [the gist here](https://gist.github.com/anoopelias/804a8defbbc153628229ec0caf6901bb).

An important concept to understand here is that Go natively allows _only_ blocking IO. What it means is an API call like `reader.ReadLine()` in the bufio package is a blocking call<sup>*</sup>. The execution will _not_ move forward on that thread (goroutine) until there is something to read. This prevents us from implementing the whole Event Loop in a single Goroutine. This kind of makes sense from Go's point-of-view since Goroutines is the main USP of Go.

### Non blocking IO
We can achieve non-blocking IO in Go, but we will have to roll on our own. We need to rely on the `syscall` package and make direct system calls. For the same reason, the below implementation will be compatible _only_ with Unix-like operating systems (Linux / Mac).

Again there are multiple ways of doing this by mixing varying levels of native Go and `syscall` implementations. For simplicity, let us stick with `syscall` as much as possible.

To start a server:

```
func startServer() (int, error) {
	sfd, err := syscall.Socket(syscall.AF_INET, syscall.SOCK_STREAM, 0)
	if err != nil {
		return 0, err
	}

	var sa syscall.SockaddrInet4
	sa.Port = 6379
	sa.Addr = [4]byte{0, 0, 0, 0}

	err = syscall.Bind(sfd, &sa)
	if err != nil {
		return 0, err
	}

	err = syscall.Listen(sfd, 50)
	if err != nil {
		return 0, err
	}

	err = syscall.SetNonblock(sfd, true)
	if err != nil {
		return 0, err
	}
	return sfd, nil
}
```

The important line to notice is the `syscall.SetNonblock(sfd, true)`. This is what makes the `sfd` (Server File Descriptor) a non-blocking one. Now whenever we try to `accept` a connection, it's a non-blocking call, we might get an `EAGAIN` error which we need to ignore and keep looping.

But instead, if we get a new `cfd` (Client File Descriptior), we need to set that as a non-blocking one and keep track of it. Like below,

```
func accept(sfd int) (int, bool, error) {
	isNew := true
	cfd, _, err := syscall.Accept(sfd)
	if err != nil {
		if shouldRetry(err) {
			isNew = false
		} else {
			return -1, isNew, err
		}
	}

	if isNew {
		err = syscall.SetNonblock(cfd, true)
		if err != nil {
			return -1, isNew, err
		}
	}
	return cfd, isNew, nil
}
```

Now in the main loop, we need to do two things
- Check if there are new connections on the `sfd` using `accept`
- Check if there is a request in existing connections (`cfds`), if it is there, we need to handle that request.
Like below,
```
func loop(sfd int) error {
	cfds := []int{}
	dict := make(map[string]string)

	for {
		// Handle new connections
		cfd, isNew, err := accept(sfd)
		if err != nil {
			return err
		}
		if isNew {
			cfds = append(cfds, cfd)
		}

		ncfds := []int{}
		// Check existing connections
		for _, cfd := range cfds {
			ctd, err := handle(cfd, dict)
			if err != nil {
				return err
			}
			if ctd {
				ncfds = append(ncfds, cfd)
			}
		}
		cfds = ncfds
	}
}
```

Note that while handling an existing `cfd` also, we need to make sure to ignore the `EAGAIN` errors,
```
func handle(cfd int, dict map[string]string) (bool, error) {
	ctd := true
	data := make([]byte, 2000)
	n, err := syscall.Read(cfd, data)
	if err != nil {
		if shouldRetry(err) {
			return ctd, nil
		}
		return ctd, err
	}

	...
```

The fully working gist is available [here](https://gist.github.com/anoopelias/7d47226178b8c44bbe73a34cca2849c1).

### Kqueue

Can we do better? Yes. The kernel itself provides a set of APIs to help with IO notifications. In FreeBSD-like operating systems (Including macOS), there is [`kqueue`](https://man.freebsd.org/cgi/man.cgi?query=kqueue&sektion=2) API. In Linux, there is [`epoll`](https://man7.org/linux/man-pages/man7/epoll.7.html) API. In this post, we will talk about `kqueue`. How this works is,
- Create a new `kqueue`.
- Whenever there is a new File Descriptor we are interested in (Say `sfd` or `cfd`), we provide that to `kqueue`.
- We wait for new events from `kqueue` (blocking call). As soon as there is a new event, we will check if it is for `sfd` or `cfd` and process it accordingly.

We don't need to keep track of all the `cfds` anymore, since that is handled by `kqueue`. Also, we won't worry about `EAGAIN` error either, since we know something is waiting on that `fd` before making an API call.

Let's see how the implementation is going to change. Let us add a generic function to add an `fd` to a `kqueue`,

```
func addEvent(kq int, fd int) error {
	ev := syscall.Kevent_t{
		Ident: uint64(fd),
		// Filter read operations
		Filter: syscall.EVFILT_READ,
		Flags:  syscall.EV_ADD,
	}

	_, err := syscall.Kevent(kq, []syscall.Kevent_t{ev}, nil, nil)
	if err != nil {
		return err
	}

	return nil
}
```

Now, as soon as we start the server, let's add `sfd` to `kqueue` and then initiate the loop,

```
func main() {

	sfd, err := startServer()
	if err != nil {
		panic(err)
	}
	defer syscall.Close(sfd)

	// Create kqueue
	kq, err := syscall.Kqueue()
	if err != nil {
		panic(err)
	}

	// Add sfd to kqueue
	err = addEvent(kq, sfd)
	if err != nil {
		panic(err)
	}

	fmt.Println("Accepting connections")

	err = loop(kq, sfd)
	if err != nil {
		panic(err)
	}
}
```

And in a loop we,
- Wait for an event from `kqueue` blocking call)
- Once there is an event, check if it is for the server or client.
   - If it is for the server, initiate an `accept`.
   - If it is for a client, initiate a handle request function.
See below,
```
func loop(kq int, sfd int) error {
	dict := make(map[string]string)
	for {
		events := make([]syscall.Kevent_t, 100)
		n, err := syscall.Kevent(kq, nil, events, nil)
		// There is a possible EINTR error for which we need to retry.
		if err != nil && !shouldRetry(err) {
			return err
		}

		for i := 0; i < n; i++ {
			if events[i].Ident == uint64(sfd) {
				err = accept(&events[i], kq, sfd)
				if err != nil {
					return err
				}
			} else {
				cfd := int(events[i].Ident)
				err = handle(cfd, dict)
				if err != nil {
					return err
				}
			}
		}
	}
}
```

The `accept` has to change too, now that we don't need to worry about the `EAGAIN` error, however, we need to add new `cfd`s to `kqueue`,
```
func accept(ev *syscall.Kevent_t, kq int, sfd int) error {
	cfd, _, err := syscall.Accept(sfd)
	if err != nil {
		return err
	}
	err = syscall.SetNonblock(cfd, true)
	if err != nil {
		return err
	}

	err = addEvent(kq, cfd)
	if err != nil {
		return err
	}

	return nil
}
```

And a minor change in `handle` not to worry about the `EAGAIN` error anymore,
```
func handle(cfd int, dict map[string]string) error {
	data := make([]byte, 2000)
	n, err := syscall.Read(cfd, data)
	if err != nil {
		return err
	}
	if n > 0 {
	
	...
```
Again, a fully working gist [here](https://gist.github.com/anoopelias/64b473083f97ce5b9b0ca944e4d373e4).

## Summary

We looked at what is an Event Loop, how it works, and how to implement it in three different ways in Go,
- Goroutines: Possibly the most idiomatic way to do this in Go.
- Nonblocking IO: We need to roll our own using `syscall` package. Sample code supported only for Unix-based Operating Systems.
- Kqueue : Using OS-level API for event notification on file descriptors. With sample code supported only for FreeBSD-based Operating Systems (including macOS).

Albeit written in C, [Redis](https://github.com/redis/redis/blob/bfe50a30edff6837897964ac3374c082b0d9e5da/src/ae_kqueue.c) uses the `kqueue`/`epoll` implementation. So does the [libuv](https://github.com/libuv/libuv/blob/be2ddacb906939d989a422e5b44f121bcf720f0d/src/unix/kqueue.c) implementation used by Node.js.

Thanks for reading, let me know in the comments what you think, if anything needs further clarification, or if you would want to see a Linux / Windows implementation, whatever. Please be kind, I'm fairly new to Go 😃.

Post your comments in Hacker News [here](https://news.ycombinator.com/item?id=35026940).

## Epilogue

Redis natively provides a client tool to benchmark implementations<sup>**</sup>, so while we are at it, why not capture some benchmarks,

```
$ redis-benchmark -t get,set -n 100000
```

Running on a 2021 MacBook Pro with Apple M1 & 16GB RAM,
```
                      avg       min       p50       p95       p99       max
Goroutines            0.268     0.032     0.279     0.351     0.551     1.311
NonblockingIO         0.263     0.128     0.255     0.335     0.543     1.215
Kqueue                0.274     0.120     0.279     0.335     0.415     0.719
Redis(antirez)        0.309     0.112     0.295     0.519     0.655     1.311
```

**Disclaimer**: All the code shared in this post is simplified for readability, it may (will) not achieve the standards and testing required for production-quality code.

**Credits**: [CodeCrafters](https://app.codecrafters.io/tracks), [Excalidraw](https://excalidraw.com/)

\* From what I read, Go wraps the non-blocking call as a blocking call. Haven't verified this fact though.

\** Isn't Redis the best? 😃