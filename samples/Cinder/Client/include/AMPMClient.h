#pragma once

#include "Osc.h"
#include "cinder/Json.h"

#include <queue>
#define USE_UDP 1

typedef std::shared_ptr<class AMPMClient> AMPMClientRef;

class AMPMClient
{
	static std::shared_ptr<AMPMClient> sInstance;

#if USE_UDP
		ci::osc::SenderUdp mSender;
		ci::osc::ReceiverUdp mListener;
#else
		ci::osc::SenderTcp mSender;
		ci::osc::ReceiverTcp mListener;
#endif

	public:
		static AMPMClient* get()
		{
			return sInstance.get();
		}
		enum LogEventLevel
		{
			info = 1,
			error,
			warning
		};

		static AMPMClientRef create( int sendPort, int recvPort );
		~AMPMClient();

		ci::JsonTree getConfig();
		void update();
		void sendEvent( std::string category = "", std::string action = "", std::string label = "", int value = 0 );
		void sendCustomMessage( std::string address, ci::JsonTree msg );
		void log( LogEventLevel level, std::string msg, char const* line, int lineNum );
		static char const* getFileForLog( char const* file );

	protected:
		AMPMClient( int sendPort, int recvPort );
		void sendHeartbeat();
};

// log macros (quick way to send log events to server)
#define LOG(M) AMPMClient::get()->log(AMPMClient::LogEventLevel::info, M, AMPMClient::getFileForLog(__FILE__), __LINE__)
#define LOG_ERR(M) AMPMClient::get()->log(AMPMClient::LogEventLevel::error, M, AMPMClient::getFileForLog(__FILE__), __LINE__)
#define LOG_WARN(M) AMPMClient::get()->log(AMPMClient::LogEventLevel::warning, M, AMPMClient::getFileForLog(__FILE__), __LINE__)
