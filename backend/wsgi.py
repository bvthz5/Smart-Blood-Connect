from app import create_app
from app.websocket import socketio

app = create_app()

if __name__ == '__main__':
    # Run the SocketIO server
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=True, log_output=True)
