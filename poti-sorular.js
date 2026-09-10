const SORULAR = [
 {
  "no": "2.1",
  "soru": "Proje organizasyon şeması (proje yönetimi) var mı ve ekip lideri ile ekip üyeleri için belirlenmiş görev ve yetkiler tanımlanmış mı?"
 },
 {
  "no": "2.2",
  "soru": "Proje geliştirme için gereken kaynaklar planlanmış ve kullanılabilir durumda mı? Değişiklikler takip ediliyor mu?"
 },
 {
  "no": "2.3",
  "soru": "Müşteri ile hazırlanmış bir Proje Planı mevcut mudur?"
 },
 {
  "no": "2.4",
  "soru": "Proje organizasyonu tarafından değişiklik yönetimi takip ediliyor mu?"
 },
 {
  "no": "2.5",
  "soru": "Sorumlu personel ile birlikte müşteri de değişikliklerin kontrolü prosesine dahil edilmekte midir?"
 },
 {
  "no": "2.6",
  "soru": "Proje için Kalite planı var mıdır? Bu plan uygulanıp belirli aralıklarla uygunluğu gözden geçirilmekte midir?"
 },
 {
  "no": "2.7",
  "soru": "Proje eskalasyon süreci var mı ve etkin bir şekilde uygulanıyor mu?"
 },
 {
  "no": "3.1",
  "soru": "Ürün ve prosesin özel gereklilikleri belirlenmiş midir?"
 },
 {
  "no": "3.2",
  "soru": "Üretim fizibilitesi hesaplanırken belirlenen şartlara bağlı olarak farklı açılardan ürün ve prosesin ihtiyaçları değerlendirildi mi?"
 },
 {
  "no": "4.1",
  "soru": "Ürün FMEA ve Proses FMEA çalışmaları yapılmış mıdır? Projenin ilerlemesinde ve alınan önlemlerle ilişkili olarak güncellenmekte midir?"
 },
 {
  "no": "4.3",
  "soru": "Nesnel kaynaklar hazır edilmiş ve seri başlangıcı güvence altına almaya uygun mudur?"
 },
 {
  "no": "4.4",
  "soru": "Ürün ve süreç geliştirme için gerekli olan uygunluk ispatları ve serbest bırakmalar mevcut mudur?"
 },
 {
  "no": "5.1",
  "soru": "Sadece onaylı/serbest bırakılmış ve kalite açısından yeterli tedarikçiler mi seçilmiştir?"
 },
 {
  "no": "5.2",
  "soru": "Tedarik zinciri oluşturulurken müşteri gereksinimleri hesaba katılmış mıdır?"
 },
 {
  "no": "5.4",
  "soru": "Outsource edilen ürünler ve servisler için zorunlu onay ve serbest bırakma kayıtları mevcut mudur?"
 },
 {
  "no": "5.5",
  "soru": "Outsource edilen ürünlerin ve servislerin kalitesi garanti altına alınmış mıdır?"
 },
 {
  "no": "5.6",
  "soru": "Satınalınan ürünler uygun bir şekilde stoklanmakta mıdır?"
 },
 {
  "no": "6.1.1",
  "soru": "Projenin geliştirme fazından üretim fazına transferi gerçekleştirlmiş ve kaydı mevcut mudur?"
 },
 {
  "no": "6.2.1",
  "soru": "Kontrol Planı esas alınarak Üretim ve Test/Muayene dökümanları uygun bir şekilde detaylandırılıp listelenmiş midir?"
 },
 {
  "no": "6.2.2",
  "soru": "Üretim akışları için yeniden serbest bırakma gerçekleşiyor mu?"
 },
 {
  "no": "6.2.3",
  "soru": "Müşterinin ürüne özel isteklerini karşılayabilecek şekilde uygun bir üretim sahası mevcut mudur?"
 },
 {
  "no": "6.2.4",
  "soru": "Özel karakteristikler üretim esnasında kontrol edilebilecek şekilde midir?"
 },
 {
  "no": "6.3.1",
  "soru": "Çalışanlar verilen görevleri yerine getirmek için uygun mu?"
 },
 {
  "no": "6.3.3",
  "soru": "Gerekli personel kaynakları mevcut mudur?"
 },
 {
  "no": "6.4.1",
  "soru": "Bakım, kalıp bakım ve tamirat işlemleri nasıl kontrol altına alınmaktadır?"
 },
 {
  "no": "6.4.2",
  "soru": "Gerekli test, muayene ve ölçüm aletleri mevcut ve kalite gerekliliklerine uygun bir şekilde etkinliği takip edilebilmekte midir?"
 },
 {
  "no": "6.4.3",
  "soru": "İş istasyonları ve test/muayene alanları ihtiyaçlara uygun mudur?"
 },
 {
  "no": "6.4.4",
  "soru": "Kalıplar, ekipman ve test/muayene araçları uygun bir şekilde saklanmakta mıdır?"
 },
 {
  "no": "6.5.3",
  "soru": "Ürün ve proseste sapma durumunda kök neden analizi yapılıp önleyici faaliyetlerin etkinliği takip edilmekte midir?"
 },
 {
  "no": "6.5.4",
  "soru": "Ürünler ve prosesler düzenli bir şekilde denetlenmekte midir?"
 },
 {
  "no": "6.6.2",
  "soru": "Ürünler/parçalar amacına uygun bir şekilde depolanmakta ve taşınma ekipmanları/paketleme donanımları ürünün/parçanın özelliklerine göre mi seçilmiştir?"
 },
 {
  "no": "6.6.4",
  "soru": "Bitmiş ürün sevkiyat aşamasında müşteri şartlarını karşılamakta mıdır?"
 },
 {
  "no": "7.1",
  "soru": "Kalite Yönetim sistemi, sevk edilen ürün ve proses yetkinlikleri müşteri ihtiyaçlarını tatmin edebilmekte midir?"
 },
 {
  "no": "7.2",
  "soru": "Müşteri hizmetleri sağlanmakta mıdır?"
 },
 {
  "no": "7.3",
  "soru": "Parça sevkiyatı garanti altına alınmış mıdır?"
 },
 {
  "no": "7.4",
  "soru": "Reklamasyonlarda hata analizi yapılarak önlemler etkin bir şekilde uygulanmakta mıdır?"
 }
];
