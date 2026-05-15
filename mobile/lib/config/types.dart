enum CallState {
  idle,
  calling,
  ringing,
  connecting,
  connected,
  disconnected,
  failed,
  busy,
  rejected,
  missed;

  bool get isActive =>
      this == calling ||
      this == ringing ||
      this == connecting ||
      this == connected;
}

class IncomingCallData {
  final String callId;
  final String callerId;
  final String? sdp;

  IncomingCallData({
    required this.callId,
    required this.callerId,
    this.sdp,
  });

  factory IncomingCallData.fromJson(Map<String, dynamic> json) {
    return IncomingCallData(
      callId: json['callId'] as String,
      callerId: json['callerId'] as String,
      sdp: json['sdp'] as String?,
    );
  }
}
