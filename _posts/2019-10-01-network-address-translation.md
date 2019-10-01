---
layout: post
title: "Network Address Translation"
categories: tech
author: Anoop Elias
---

I had a _Raspberry Pi 3_ lying around, and I had a great idea. Let's host a [Tor relay](https://www.eff.org/torchallenge/what-is-tor.html)! This is the story of that _failed_ mission.

To host a Tor relay, you need two things,
 - A fairly good internet connection,
 - A computer that can be online almost all the time,

or so I thought. But the devil is in the details! We will get there in due course.

---
### Pi Setup

The Pi already had an SD card. I had a wireless keyboard, mouse, and monitor with HDMI. The typical micro USB phone chargers are not powerful enough for a Pi 3. Thankfully I had this figured already and had ordered one.

![](https://i.imgur.com/Qw9P7BW.jpg)

Let's boot to the beautiful Raspbian background.

![](https://imgur.com/9dNgIwY.png)

Next some basic cleanup on Raspbian,

Set a new password:
```
pi@raspberrypi:~ $ sudo passwd pi
Enter new UNIX password:
```

Start SSH:
```
pi@raspberrypi:~ $ sudo systemctl enable ssh
pi@raspberrypi:~ $ sudo systemctl start ssh
```

The easiest way to find the IP of your device without even touching it is to go to the DHCP Client List of your router. Finding the IP is like this is very useful once you have the Pi connected to the network sitting in some corner without an attached keyboard or monitor.

Open your browser on the laptop and hit your [routers IP](https://www.techspot.com/guides/287-default-router-ip-addresses/). For Belkin, it is [http://192.168.2.1/](http://192.168.2.1/). For most routers, DHCP Client List will be there in the menu once you log in.

![](https://i.imgur.com/7fuhQmt.png)

(I don't know, maybe you could get the 'Private IP' of our Pi to be static, but that's for another day, not in our MVP)

There you go, now you can shell into the Pi from your own laptop,
```
$ ssh pi@192.168.2.12
pi@192.168.2.12's password:
Linux raspberrypi 4.19.66-v7+ #1253 SMP Thu Aug 15 11:49:46 BST 2019 armv7l

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Sun Sep 29 22:05:06 2019 from 192.168.2.40
pi@raspberrypi:~ $
```

We're just getting started..

---
### Remote Pi

Now, this is a computer that needs to be connected by wire to the router sitting on top of my fridge. It's a small board, it can sit close to its home. But, I can't get a monitor next to it. Solution: _VNC_.

```
pi@raspberrypi:~ $ sudo apt-get install tightvncserver
pi@raspberrypi:~ $ tightvncserver
```

Now that we have our VNC server running fine, let's try connecting from a client.

On the laptop, if you may,
```
$ sudo apt-get install vncviewer
$ vncviewer
```

On the prompt, enter the private IP of Pi `192.168.2.12`. But alas!
```
vncviewer: ConnectToTcpAddr: connect: Connection refused
Unable to connect to VNC server
$
```

Hmm.. ! Actually, this took some time to figure out. Back in Pi, when we made sure the vncserver is running,

```
pi@raspberrypi:~ $ ps aux | grep vnc
pi         754  0.1  1.8  56068 17148 ?        S    12:18   0:47 Xtightvnc :1 -desktop X -auth /home/pi/.Xauthority -geometry 1024x768 -depth 24 -rfbwait 120000 -rfbauth /home/pi/.vnc/passwd -rfbport 5901 -fp /usr/share/fonts/X11/misc/,/usr/share/fonts/X11/Type1/,/usr/share/fonts/X11/75dpi/,/usr/share/fonts/X11/100dpi/ -co /etc/X11/rgb
pi@raspberrypi:~ $
```

Look at it real close. Xtightvnc is running on port 5901, not on its default 5900. For whatever reason!

Okay then try `vncviewer` again, but this time, the host is `192.168.2.12:5901`.

![](https://i.imgur.com/YKkhp8E.png)

Voila! Pi goes all the way to the top of the fridge.. :joy: Let's get on with the Tor part now.

---
### Network Address Translation

_For Pi to be a Tor relay, it needs to be accessible from the public network._

When you are connected to the Internet, it only means that your PC can access the computers on the Internet. It doesn't mean that those computers (or people) can access your PC. There will be an umpteen number of firewalls to prevent that to happen. On top of that, since the Internet is [running out of IPV4 addresses](https://en.wikipedia.org/wiki/IPv4_address_exhaustion), the router puts up a concept called 'NAT'.

This is where we talk about 'Private IP' and 'Public IP'. Hopefully, the concept will be clear with the picture below,

![](https://i.imgur.com/mRFpBr3.png)

When the 'Private IP: F' access let's say 'Public IP: B', from B's point of view the request is coming from your router's 'Public IP: D'\*. Only your router gets a public IP, while your PCs, phones, smart TVs, all those will get only a 'Private IP'!

Now to the million-dollar question: If 'Public IP: B' wants to access 'Private IP: F', how is that possible? 'B' is not even aware of the existence of 'F'!

That magic is called 'Network Address Translation' a.k.a. 'NAT'. The trick is simple. You use both IP and port for the mapping. Even though we are running short of IPs, we have no shortage of ports. Each IP can handle over 65000+ ports.

Let's look at the 'Virtual Servers' table I have put up on my Belkin configuration,

![](https://i.imgur.com/bjC9wno.png)

Here we are saying that if an incoming request on the router comes on port 22 (SSH) or port 5901 (VNC), it needs to be forwarded to the Pi (`192.168.2.12`). On the other hand, if it comes on port 80, forward it to the laptop (`192.168.2.40`).

**Now to the current problem:** _Even after adding Virtual Servers, SSH on my public IP fails..._ :worried:.
```
$ ssh pi@106.51.241.13
ssh: connect to host 106.51.241.13 port 22: Connection timed out
```

I am guessing that the TCP handshake is not reaching the router, this could be a firewall with my ISP, they could be blocking these incoming connections before even it reaches the router. This is a home network after all. I have raised a ticket with them and am waiting for a reply as we speak.

---
### UPnP

How can we prove that the TCP handshake is not reaching the router? The router does not have an OS in it, its some kind of firmware that is running there. Can we see what is going on inside? Keep looking!

![](https://i.imgur.com/njfmNKP.png)

Hmm... Interesting! Whenever the BitTorrent client starts on a PC, a set of NAT rules gets added automatically on the router. How come?

Did a bit more digging. It seems, there is a protocol called [Universal Plug n Play (UPnP)](https://en.wikipedia.org/wiki/Universal_Plug_and_Play) that most of the network devices support. With that, you can programmatically add a NAT rule into the router. While we are at it, let's try that too.

The [MiniUPnP](http://miniupnp.free.fr/) project provides tools to do this from the command line,

```
pi@raspberrypi:~ $ sudo apt-get install miniupnpc
```

And,
```
pi@raspberrypi:~ $ upnpc -l
upnpc : miniupnpc library test client. (c) 2005-2014 Thomas Bernard
Go to http://miniupnp.free.fr/ or http://miniupnp.tuxfamily.org/
for more information.
List of UPNP devices found on the network :
 desc: http://192.168.2.1:35108/rootDesc.xml
 st: urn:schemas-upnp-org:device:InternetGatewayDevice:1

Found valid IGD : http://192.168.2.1:35108/ctl/IPConn
Local LAN ip address : 192.168.2.12
Connection Type : IP_Routed
Status : Connected, uptime=27340s, LastConnectionError : ERROR_NONE
  Time started : Sun Sep 29 19:34:14 2019
MaxBitRateDown : 4200000 bps (4.2 Mbps)   MaxBitRateUp 4200000 bps (4.2 Mbps)
ExternalIPAddress = 10.242.204.104
 i protocol exPort->inAddr:inPort description remoteHost leaseTime
 0 TCP 34674->192.168.2.2:34674 'NAT-PMP 29996' '' 0
 1 UDP 34674->192.168.2.2:34674 'NAT-PMP 29996' '' 0
GetGenericPortMappingEntry() returned 713 (SpecifiedArrayIndexInvalid)
```

Okay, so our Belkin supports this, let us add SSH port on our Pi,
```
pi@raspberrypi:~ $ upnpc -e 'SSH on Raspberry Pi' -r 22 TCP
upnpc : miniupnpc library test client. (c) 2005-2014 Thomas Bernard
Go to http://miniupnp.free.fr/ or http://miniupnp.tuxfamily.org/
for more information.
List of UPNP devices found on the network :
 desc: http://192.168.2.1:35108/rootDesc.xml
 st: urn:schemas-upnp-org:device:InternetGatewayDevice:1

Found valid IGD : http://192.168.2.1:35108/ctl/IPConn
Local LAN ip address : 192.168.2.12
ExternalIPAddress = 10.242.204.104
InternalIP:Port = 192.168.2.12:22
external 10.242.204.104:22 TCP is redirected to internal 192.168.2.12:22 (duration=0)

```

Ha, it gets added!

![](https://i.imgur.com/SKnzvfm.png)

But sadly, no luck even then,
```
$ ssh pi@10.242.204.104
ssh: connect to host 10.242.204.104 port 22: Connection refused
```

Maybe let's call it a day and let those ISP folks get back.

---

### Finally..
Even though the outcome is not positive, this has been a wonderful learning experience. I have a Pi in my home which I can remote into whenever I feel like. And always looking to do more things with the Pi.

When you start digging, you might go really deep. Be careful to bring your head above once in a while to see what you are doing.

\* You would need NAT for outgoing TCP connections as well. Think about it, TCP is a duplex protocol. So a packet coming from outside needs to find its way to the 'Private IP'. However, those port numbers are internally managed by the router.
