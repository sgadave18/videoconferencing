let APP_ID = "38f99d48b8054706bb4ba6d7c03845ae"

let authUsers = ['Swapnil', 'Swappy']

let token = null;


let client;
let channel;

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')
let uid = urlParams.get('uid')

if (!roomId) {
    window.location = 'lobby.html'
    window.location = 'lobby.html'
}

if (authUsers.includes(uid)) {
    console.log(uid);
}

let localVideoStream;
let localAudioStream;
let remoteVideoStream;
let remoteAudioStream;


const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

let peerConnection;

let constraints = {
    video: {
        width: { min: 640, ideal: 1920, max: 1920 },
        height: { min: 480, ideal: 1080, max: 1080 },
    },
    audio: true
}

let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({ uid, token })

    channel = client.createChannel(roomId)
    await channel.join()

    channel.on('MemberJoined', async (MemberId) => {
        console.log('A new user joined the channel:', MemberId)
        createOffer(MemberId)
    })


    channel.on('MemberLeft', (MemberId) => {
        console.log("Member Left : ", MemberId)
        document.getElementById('user2v').style.display = 'none'
        document.getElementById('user1v').classList.remove('smallFrame')
    })



    client.on('MessageFromPeer', async (message, MemberId) => {

        message = JSON.parse(message.text)

        if (message.type === 'offer') {
            createAnswer(MemberId, message.offer)
        }

        if (message.type === 'answer') {
            addAnswer(message.answer)
        }

        if (message.type === 'candidate') {
            if (peerConnection) {
                peerConnection.addIceCandidate(message.candidate)
            }
        }

//audioRemoteUser
    })

    await navigator.mediaDevices.getUserMedia(constraints).then((streams) => {
        localAudioStream = streams.getAudioTracks();
        let localVideoStreamTrack = streams.getVideoTracks();
        localVideoStream = new MediaStream(localVideoStreamTrack);
        console.log("STREAM****",streams);
        // localVideoStream.forEach((track)=>{
            document.getElementById('user1v').srcObject = localVideoStream;
            // console.log("VIDEO TRACKS****",track);
        // });
        // document.getElementById('user1a').srcObject = localAudioStream
    }).catch((err)=>{
        console.log(err)
    })

}


// let handleUserLeft = (MemberId) => {
//     document.getElementById('user-2').style.display = 'none'
//     document.getElementById('user-1').classList.remove('smallFrame')
// }

// let handleMessageFromPeer = async (message, MemberId) => {

//     message = JSON.parse(message.text)

//     if (message.type === 'offer') {
//         createAnswer(MemberId, message.offer)
//     }

//     if (message.type === 'answer') {
//         addAnswer(message.answer)
//     }

//     if (message.type === 'candidate') {
//         if (peerConnection) {
//             peerConnection.addIceCandidate(message.candidate)
//         }
//     }


// }

// let handleUserJoined = async (MemberId) => {
//     console.log('A new user joined the channel:', MemberId)
//     createOffer(MemberId)
// }


let createPeerConnection = async (MemberId) => {

    peerConnection = new RTCPeerConnection(servers)
    let remoteStream = new MediaStream();
    remoteVideoStream = remoteStream.getVideoTracks();
    remoteAudioStream = remoteStream.getAudioTracks();
    document.getElementById('user2v').srcObject = remoteVideoStream
    document.getElementById('audioRemoteUser').srcObject = remoteAudioStream
    document.getElementById('user2v').style.display = 'block'

    document.getElementById('user1v').classList.add('smallFrame')


    if (!localStream) {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((streams) => {
            console.log("STREAM ----",streams);
            localAudioStream = streams.getAudioTracks();
            localVideoStream = streams.getVideoTracks();
            document.getElementById('user1v').srcObject = localVideoStream;
            // document.getElementById('user1a').srcObject = localAudioStream
        }).catch((err) => {
            console.log(err)
        })
    }

    localAudioStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localAudioStream)
    })

    localVideoStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localVideoStream)
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getAudioTracks().forEach((track)=>{
            remoteAudioStream.addTrack(track);
        })
        event.streams[0].getVideoTracks().forEach((track)=>{
            remoteVideoStream.addTrack(track);
        })
        // event.streams[0].getTracks().forEach((track) => {
        //     remoteStream.addTrack(track)
        // })
    }

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }) }, MemberId)
        }
    }
}

let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, MemberId)
}


let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'answer', 'answer': answer }) }, MemberId)
}


let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer)
    }
}


let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}

let toggleCamera = async () => {
    let videoTrack = localVideoStream//.getTracks().find(track => track.kind === 'video')
    console.log("Video TRACK", videoTrack)
    if (videoTrack.enabled) {
        videoTrack.enabled = false
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)'
    } else {
        videoTrack.enabled = true
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
    }
}

let toggleMic = async () => {

    let audioTrack = localAudioStream//.getTracks().find(track => track.kind === 'audio')
    console.log("AUDIO TRACK", audioTrack)
    if (audioTrack.enabled) {
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)'
    } else {
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
    }
}

window.addEventListener('beforeunload', leaveChannel)

// document.getElementById('camera-btn').setAttribute('onclick', `${toggleCamera}`)
// document.getElementById('mic-btn').setAttribute('onclick', `${toggleMic}`)

init()