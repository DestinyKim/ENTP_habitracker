// 캐시 버전 - 파일을 수정할 때마다 이 숫자를 올리면 기존 캐시가 자동 갱신됩니다
const CACHE_VERSION = 'momentum-v11';

// 상대경로 사용 (GitHub Pages 서브경로에서도 안전하게 작동)
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 설치 이벤트
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      console.log('Momentum 캐시 생성:', CACHE_VERSION);
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// 활성화 이벤트 - 오래된 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_VERSION) {
            console.log('오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch 이벤트 - 네트워크 먼저, 실패시 캐시 (항상 최신 유지 + 오프라인 지원)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 성공적인 응답을 캐시에 저장
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_VERSION).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // 네트워크 실패시 캐시에서 반환
        return caches.match(event.request).then(response => {
          return response || new Response('오프라인 상태입니다.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// 메시지 수신
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
