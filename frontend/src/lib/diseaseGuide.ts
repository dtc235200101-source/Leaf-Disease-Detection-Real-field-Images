/**
 * Nội dung tra cứu cho đúng 9 lớp cà chua của `configs/classes.yaml`.
 *
 * - `symptom`: mô tả triệu chứng/tác nhân đã dùng trong ứng dụng
 *   (trước đây nằm ở `pages/LibraryPage.tsx`).
 * - `actions` + `caution`: lấy nguyên văn từ bảng `_GUIDANCE`
 *   trong `src/tomato_det/serving/services/recommendations.py`
 *   (cùng nội dung backend trả về trong trường `recommendations` của /api/detect).
 * - `example`: đường dẫn ảnh thật trong dataset, phục vụ qua `/api/dataset/image/train`.
 */

export interface DiseaseGuide {
  symptom: string;
  actions: string[];
  caution: string;
  example: string;
}

export const DISEASE_GUIDE: Record<string, DiseaseGuide> = {
  early_blight: {
    symptom:
      "Nấm Alternaria solani. Đốm tròn đồng tâm màu nâu như vầng đá, lan từ lá dưới lên trên.",
    actions: [
      "Tỉa bỏ lá có triệu chứng nặng và vệ sinh tàn dư.",
      "Tưới vào gốc, giữ tán thông thoáng và luân canh cây trồng.",
    ],
    caution: "Nếu cần thuốc, hỏi cán bộ khuyến nông về hoạt chất được phép tại địa phương.",
    example: "train/1576389-early%20blight%20symptoms.jpg",
  },
  septoria_leaf_spot: {
    symptom:
      "Nấm Septoria lycopersici. Chấm nhỏ tròn 2–3 mm, trung tâm xám viền tím, lá khô rồi rụng.",
    actions: [
      "Loại bỏ lá nhiễm sớm, khử trùng dụng cụ sau khi tỉa.",
      "Giảm ẩm trên lá; không tưới phun lên tán và duy trì khoảng cách cây.",
    ],
    caution: "Theo dõi lá non định kỳ vì bệnh thường lan từ lá già lên trên.",
    example: "train/3-septoria-leaf-blight-n.jpg",
  },
  bacterial_spot: {
    symptom: "Xanthomonas spp. Đốm tối bóng nước, mép vàng, lá rách như bị đạn bắn.",
    actions: [
      "Cách ly cây có triệu chứng, hạn chế chạm tay hoặc dụng cụ khi lá ướt.",
      "Dùng hạt/cây giống sạch bệnh, vệ sinh khu vực và tránh tưới phun.",
    ],
    caution: "Không tự pha hoặc tăng liều chế phẩm; tham khảo hướng dẫn chuyên môn địa phương.",
    example: "train/Bacterial+Spot+-+Tomatoes.jpg",
  },
  late_blight: {
    symptom: "Phytophthora infestans. Vết loang mờ sũng nước, mặt dưới có lớp lông mốc trắng.",
    actions: [
      "Kiểm tra toàn ruộng ngay, loại bỏ phần cây nhiễm nặng để giảm nguồn lây.",
      "Giảm thời gian lá ướt, tăng thông thoáng và không để tàn dư bệnh ngoài ruộng.",
    ],
    caution: "Bệnh có thể lan nhanh khi ẩm mát; cần liên hệ cán bộ bảo vệ thực vật sớm.",
    example: "train/2017-08-27%2B-%2BLate%2BBlight%2Bon%2BGypsy%2B1.jpg",
  },
  mosaic_virus: {
    symptom: "Tomato mosaic virus. Lá nhổn, xanh vàng lốm đốm khảm, cây lùn.",
    actions: [
      "Nhổ và cách ly cây nghi nhiễm để hạn chế lây lan cơ học.",
      "Vệ sinh tay, dụng cụ và kiểm soát côn trùng môi giới theo hướng dẫn địa phương.",
    ],
    caution:
      "Virus không được xử lý bằng thuốc trừ nấm; nên xác nhận bằng chuyên gia hoặc xét nghiệm khi cần.",
    example: "train/3-tomato-mosaic-virus_web.jpg",
  },
  yellow_virus: {
    symptom: "TYLCV. Lá vàng xoăn lên, nhỏ lại, hoa rụng, khó ra quả.",
    actions: [
      "Cách ly hoặc loại bỏ cây nghi nhiễm; kiểm tra cây lân cận.",
      "Dùng lưới, giống sạch bệnh và quản lý côn trùng môi giới theo IPM.",
    ],
    caution: "Cần xác nhận thực địa vì vàng lá cũng có thể do dinh dưỡng hoặc stress.",
    example:
      "train/tomato-plant-virus-tomato-yellow-leaf-curl-virus-tomato-plant-disease-mosaic-virus.jpg",
  },
  leaf_mold: {
    symptom: "Fulvia fulva. Mặt trên có vệt vàng nhợt, mặt dưới phủ lớp mốc olive xám.",
    actions: [
      "Tỉa lá bệnh, tăng thông gió và giảm ẩm trong tán/nhà màng.",
      "Tưới vào gốc, tránh để nước đọng trên lá và dọn sạch tàn dư.",
    ],
    caution: "Theo dõi mặt dưới lá vì triệu chứng sớm thường xuất hiện tại đó.",
    example: "train/Leaf+mold+tomato+%25282%2529.JPG.jpg",
  },
  spider_mites: {
    symptom: "Tetranychus urticae. Lá đầy chấm li ti vàng trắng, mặt dưới có mạng nhện mỏng.",
    actions: [
      "Kiểm tra mặt dưới lá, loại bỏ ổ nhện nặng và giảm bụi khô quanh vườn.",
      "Bảo tồn thiên địch; chỉ dùng biện pháp kiểm soát phù hợp sau khi xác định mật số.",
    ],
    caution:
      "Tránh dùng thuốc phổ rộng tùy tiện vì có thể làm mất thiên địch và bùng phát nhện.",
    example: "train/SpotSpeckBlightMite-1l4v879.jpg",
  },
  healthy: {
    symptom: "Không phát hiện triệu chứng bệnh — nhận diện để giảm báo động nhầm.",
    actions: ["Duy trì tưới, dinh dưỡng và thông thoáng phù hợp.", "Tiếp tục theo dõi định kỳ, đặc biệt sau mưa hoặc khi độ ẩm cao."],
    caution: "Đây là nhận định từ ảnh, không thay thế kiểm tra trực tiếp.",
    example: "train/8.--Virus-Damaged-foliage-at-top-versus-healthy,-non-infected-bottom-foliage.jpg",
  },
};
