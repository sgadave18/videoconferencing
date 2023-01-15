let localStream;
let remoteStream;

const APP_ID = "38f99d48b8054706bb4ba6d7c03845ae"
let token = null;

let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;


const servers = {
    iceServers: [
        {
            urls: [
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302"
            ]
        }
    ]
}

let init = async () => {

    client = await AgoraRTM.createInstance(APP_ID);
    await client.login({ uid, token });

    channel = client.createChannel("main");
    await channel.join();

    channel.on('MemberJoined', handleUserJoined)

    client.on('MessageFromPeer', handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    document.getElementById('user1').srcObject = localStream;
    console.log("LOCAL STREAM++++++++++",localStream);

}

let handleMessageFromPeer = async (message, MemberId) => {

    message = JSON.parse(message.text);
    console.log("MESSEGE FROM PEER----",message);

    if (message.type === 'offer') {
        console.log("IN MESSEGE TYPE OFFER**************************")
        createAnswer(MemberId, message.offer);
    }

    if (message.type === 'answer') {
        addAnswer(message.answer);
    }

    if (message.type === 'candidate') {
        if (peerConnection) {
            // console.log("RTCPEERCONNECTION REMOTE DESCRIPTION----******",peerConnection.currentRemoteDescription);
            // if (peerConnection.currentRemoteDescription) {
                peerConnection.addIceCandidate(message.candidate);
            // }

        }
    }
}


let handleUserJoined = async (MemberId) => {
    // console.log("New User Joined : ", MemberId);
    createOffer(MemberId);
}

let createPeerConnection = async (MemberId) => {
console.log("IN CREATE PEER CONNECTION***********")
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    console.log("IN CREATE PEER CONNECTION REMOTE STREAM***********-----",remoteStream);
    document.getElementById('user2').srcObject = remoteStream


    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        document.getElementById('user1').srcObject = localStream;
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }) }, MemberId);
            // console.log('New ICE candidate : ', event.candidate);
        }
    }
}

let createOffer = async (MemberId) => {

    await createPeerConnection(MemberId);

    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, MemberId);


}


let createAnswer = async (MemberId, offer) => {
    console.log("IN CREATE ANSWER **********")
    await createPeerConnection(MemberId);
    console.log("IN CREATE ANSWER AFTER CREATE PEER CONNECTION***********")
    await peerConnection.setRemoteDescription(offer);
    console.log("IN CREATE ANSWER REMOTE DESCRIPTION-----",peerConnection.currentRemoteDescription)
    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log("IN CREATE ANSWER ----",peerConnection.currentRemoteDescription)
    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'answer', 'offer': answer }) }, MemberId);

}

let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer);
    }
}

init();