# Giờ cao điểm và thấp điểm của DeepSeek — ngày làm việc theo giờ Bắc Kinh, không phải UTC

[English](./README.md) · [中文](./README_CN.md) · [Español](./README_ES.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · **Tiếng Việt** · [Français](./README_FR.md) · [Deutsch](./README_DE.md) · [Русский](./README_RU.md) · [Bahasa Indonesia](./README_ID.md)

Cao điểm là **thứ Hai đến thứ Sáu, 09:00–12:00 và 14:00–18:00 giờ Bắc Kinh** — tức `01:00-04:00` và `06:00-10:00` UTC — mọi giờ còn lại là thấp điểm, giá bằng một nửa. Từ 2026-08-23, cả cuối tuần đều là thấp điểm, và cuối tuần đó được tính theo giờ Bắc Kinh: nó chạy **từ 16:00 UTC thứ Sáu đến 16:00 UTC Chủ nhật**, không phải từ nửa đêm đến nửa đêm UTC. Kho này là bảng kiểm thử có ghi ngày ghim những ranh giới đó, kèm một bản cài đặt tham chiếu khoảng ba mươi dòng.

## Giá (USD trên mỗi triệu token, thấp điểm / cao điểm)

| Mô hình | Đầu vào, trúng cache | Đầu vào, trượt cache | Đầu ra |
| --- | ---: | ---: | ---: |
| `deepseek-v4-flash` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-flash-vision-exp` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-pro` | 0.022 / 0.044 | 0.66 / 1.32 | 1.98 / 3.96 |

Đọc ngày 2026-08-23 tại <https://api-docs.deepseek.com/quick_start/pricing/>. Giá có thể thay đổi; trang của nhà cung cấp mới là chuẩn.

## Nguyên văn trên hai phiên bản trang của nhà cung cấp

> **EN** — Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday (all other hours are off-peak).

> **ZH** — 空闲时段价格为高峰时段价格的一半。高峰时段为北京时间周一至周五 9:00 - 12:00、14:00 - 18:00（其余为空闲时段）。

Hai trích dẫn được giữ nguyên ngôn ngữ gốc: chúng là bằng chứng, dịch ra thì không còn là nguyên văn nữa. Giờ giấc thì khớp — 09:00–12:00 và 14:00–18:00 giờ Bắc Kinh *chính là* 01:00–04:00 và 06:00–10:00 UTC. Lịch thì không. Câu tiếng Trung đặt ngày làm việc theo giờ Bắc Kinh (北京时间周一至周五); câu tiếng Anh gắn `UTC` vào giờ và để «Monday through Friday» lơ lửng, đọc ra thành ngày làm việc theo UTC. Hai cách đọc chỉ khác nhau trong khoảng 16:00–24:00 UTC thứ Sáu và Chủ nhật: mười sáu giờ mỗi tuần. Kho này theo cách diễn đạt tiếng Trung.

## Ba chỗ dễ sai, và chỗ thứ ba thì vô hình

**1. Hồi tố.** Hàm tính giá được gọi với dấu thời gian trong quá khứ — phát lại sổ cái, tính lại mức dùng, bảng điều khiển chi phí cho các yêu cầu đã qua. Một khoản giảm giá cuối tuần áp dụng vô điều kiện sẽ âm thầm cắt một nửa mọi hóa đơn cuối tuần trước khi có quy tắc. Khoản giảm phải gắn với thời điểm hiệu lực, và với đồng hồ đếm ngược thì điều kiện đặt trên thời điểm *ứng viên*, không phải trên «bây giờ».

**2. Đếm ngược rơi vào bên trong cuối tuần.** Trong cuối tuần, cả hai phía của mọi ranh giới cửa sổ đều là thấp điểm, nên đồng hồ đếm đến ranh giới kế tiếp sẽ về 0 mà chẳng có gì thay đổi. Từ 18:30 thứ Sáu giờ Bắc Kinh, thay đổi thật sự tiếp theo là 09:00 thứ Hai — khoảng 63 giờ, đủ dài để một vài chuỗi giao diện bị tràn.

**3. Đọc thứ trong tuần từ sai lịch — và không bài kiểm thử nào dựa trên lịch trình hiện hành phát hiện được.** Cuối tuần theo giờ Bắc Kinh chạy **từ 16:00 UTC thứ Sáu đến 16:00 UTC Chủ nhật**. Hai lịch chỉ khác nhau trong khoảng 16:00–24:00 UTC, mà cả hai cửa sổ cao điểm của DeepSeek đều nằm ngoài khoảng đó. Vì vậy một bản cài đặt đọc thứ từ thời điểm chưa quy đổi sẽ vượt qua mọi vector bạn viết được theo cửa sổ chính thức, và bắt đầu nói dối đúng vào ngày nhà cung cấp dời một cửa sổ ra sau 16:00 UTC.

## Hai thời điểm ghim trục lịch

`2026-08-28T16:30:00Z` và `2026-08-30T16:30:00Z`. Bảng còn kèm một lịch trình **được ghi rõ là tổng hợp**, với cửa sổ cao điểm phủ 16:00–22:00 UTC. Đó không phải lịch trình thật của nhà cung cấp và cũng không được đưa ra như vậy — nó là cách duy nhất để ghim trục lịch. Nhân tiện: nếu mã tính giá của bạn không tham số hóa theo lịch trình thì trục này không thể kiểm thử được, và riêng điều đó đã đáng biết.

## Cách dùng

Hoặc bạn chuyển `phase_at` sang — ba mươi dòng buồn tẻ và lịch trình chỉ là dữ liệu — hoặc bỏ qua hẳn phần Python và dán mảng `vectors` vào bất cứ thứ gì dự án bạn dùng cho kiểm thử theo bảng. Mỗi mục là một thời điểm UTC, giờ treo tường Bắc Kinh tương ứng, pha mong đợi, và một dòng nói nó phân biệt điều gì.

```
python3 check_vectors.py     # 18/18 passed
```

## Ở nơi khác

- Cùng quy tắc đó viết thành văn xuôi, đặt cạnh nhau hai phiên bản ghi chú của nhà cung cấp, và mọi mức giá được đọc lại mỗi ngày: <https://xyzs996.github.io/llm-api-pricing/deepseek-peak-hours.html>
- Một máy tính áp các quy tắc này lên hóa đơn thật — chọn mô hình, nhập cơ cấu token, nó cho biết bạn đang ở phía nào của biểu giá ngay lúc này và chờ thì được bao nhiêu: <https://xyzs996.github.io/llm-cost-calculator/>
- README tiếng Anh đầy đủ (từng vector, bảng đối chiếu kiểm thử đột biến, và mẫu khảo sát 19 bản cài đặt): <https://github.com/xyzs996/deepseek-peak-offpeak-vectors/blob/main/README.md>
