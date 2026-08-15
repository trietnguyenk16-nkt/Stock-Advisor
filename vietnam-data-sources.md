# Khảo sát nguồn dữ liệu thị trường Việt Nam

Ngày khảo sát: 15/08/2026.

## Kết luận sơ bộ

Ứng dụng sẽ thu hẹp asset universe về cổ phiếu niêm yết/UPCoM tại Việt Nam, chứng chỉ quỹ/ETF Việt Nam và giá vàng trong nước. Không nên tiếp tục dùng Yahoo Finance làm nguồn ưu tiên cho nhóm này vì mã Việt Nam và NAV quỹ có độ phủ không đồng nhất. Thiết kế adapter cần tách theo loại tài sản, ghi `source`, `asOf`, `currency`, đơn vị giá và trạng thái độ trễ.

| Nhóm dữ liệu | Nguồn ưu tiên | Quan sát xác minh | Vai trò đề xuất |
| --- | --- | --- | --- |
| Cổ phiếu HOSE | HOSE, https://www.hsx.vn/ | Trang chính thức của Sở Giao dịch Chứng khoán TP.HCM; trang dữ liệu tổng hợp và bảng giá trực tuyến tồn tại. HOSE có biểu giá dịch vụ riêng cho dữ liệu trực tuyến và dữ liệu trễ, vì vậy cần kiểm tra điều khoản trước khi dùng scraping/production. | Ưu tiên cho mã HOSE nếu có endpoint hoặc feed được phép; fallback sang nguồn thương mại/hợp pháp. |
| Cổ phiếu HNX/UPCoM | HNX, https://hnx.vn/co-phieu.html | Trang chính thức hiển thị mã, giá, thay đổi và phần trăm thay đổi; có thông báo dữ liệu trễ 15 phút và liên kết bảng giá trực tuyến. | Nguồn tham chiếu chính cho HNX/UPCoM; cần adapter có rate limit và parser chịu thay đổi HTML. |
| Chứng chỉ quỹ/NAV | CafeF, https://cafef.vn/du-lieu/chung-chi-quy.chn | Trang có bảng hiệu suất chứng chỉ quỹ, tổ chức phát hành, giá NAV gần nhất, ngày NAV và các mã như VCBF-TBF, VCBF-BCF, VNDBF, VFF, VCBF-FIF. | Fallback tổng hợp cho discovery/NAV; cần ưu tiên xác minh chéo với trang chính thức của công ty quản lý quỹ. |
| NAV chính thức của quỹ | Trang công ty quản lý quỹ, ví dụ Dragon Capital https://dautu.dragoncapital.com.vn/ và VCBF https://www.vcbf.com/ | Các công ty quản lý quỹ giải thích NAV và thường công bố dữ liệu quỹ; mã mở có thể có lịch định giá khác giá khớp lệnh ETF. | Nguồn chính thức theo từng fund manager cho NAV, ngày định giá và dữ liệu sản phẩm. |
| Giá vàng SJC | SJC, https://sjc.com.vn/ | Trang chính thức có mục Giá vàng SJC, đơn vị ngàn đồng/lượng, cột mua vào/bán ra và biểu đồ giá vàng hôm nay; đồng thời có tin tức thị trường vàng. | Nguồn ưu tiên cho vàng miếng SJC; lưu cả bid/ask, đơn vị VND/lượng và timestamp hiển thị. |
| Giá vàng PNJ/DOJI | PNJ https://www.pnj.com.vn/site/gia-vang và DOJI https://doji.vn/ | Có các trang thương hiệu công bố giá vàng; cần xác minh cấu trúc dữ liệu, điều khoản và tần suất cập nhật khi implement. | Fallback/so sánh chéo cho vàng trong nước; không trộn giá SJC, PNJ, DOJI thành một chuỗi duy nhất. |
| Tin tức | CafeF và nguồn chính thức của HOSE/HNX/SJC/quỹ | CafeF có khu vực tin mới và bài viết liên quan đến thị trường/quỹ; nguồn Sở và doanh nghiệp có công bố chính thức. | Thu thập link, tiêu đề, nguồn, publishedAt; khử trùng lặp; luôn giữ link gốc. |

## Các giới hạn cần xử lý

HOSE và HNX có thể hiển thị dữ liệu công khai nhưng quyền tái sử dụng, tần suất truy cập, dữ liệu realtime và việc scraping cần được kiểm tra kỹ trước khi đưa lên production. Với chu kỳ 2 giờ, phương án an toàn là dùng dữ liệu trễ/EOD hoặc API/feed được cấp quyền thay vì giả định rằng bảng giá HTML là API công khai ổn định.

Giá chứng chỉ quỹ mở thường là NAV theo ngày định giá, không phải giá giao dịch liên tục như cổ phiếu. UI cần hiển thị rõ `NAV date` và không gọi đây là giá realtime. Giá vàng trong nước có chênh lệch mua/bán và khác nhau theo thương hiệu; tài sản vàng phải lưu brand/product riêng, tối thiểu bắt đầu bằng SJC 1 lượng.

## Kiến trúc adapter đề xuất

`VietnamMarketProvider` gồm ba adapter độc lập: `VietnamEquityProvider` cho HOSE/HNX/UPCoM, `VietnamFundNavProvider` cho NAV theo fund manager/CafeF fallback, và `VietnamGoldProvider` cho SJC trước rồi PNJ/DOJI. Mỗi adapter trả về cùng một chuẩn: `ticker`, `assetType`, `displayName`, `price` hoặc `nav`, `bid`, `ask`, `changePercent`, `currency`, `unit`, `asOf`, `sourceUrl`, `sourceName`, `freshness` và `warnings`.

## Tài liệu tham chiếu

1. HOSE: https://www.hsx.vn/
2. HNX cổ phiếu/UPCoM: https://hnx.vn/co-phieu.html
3. SJC giá vàng: https://sjc.com.vn/
4. CafeF chứng chỉ quỹ: https://cafef.vn/du-lieu/chung-chi-quy.chn
5. PNJ giá vàng: https://www.pnj.com.vn/site/gia-vang
6. DOJI: https://doji.vn/
7. Dragon Capital kiến thức NAV: https://dautu.dragoncapital.com.vn/kien-thuc/gia-chung-chi-quy-nav
8. VCBF: https://www.vcbf.com/
