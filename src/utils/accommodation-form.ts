export interface AccommodationFormValues {
  title: string;
  price: string;
  // Address
  city: string;
  district: string;
  ward: string;
  street: string;
  // Details
  roomType: string;
  area: string;
  maxOccupants: string;
  deposit: string;
  availableFrom: string;
  // Extra costs
  electricity: string;
  water: string;
  internet: string;
  otherCost: string;
  // Amenities
  amenities: string[];
  // Terms & Description
  description: string;
  rentalTerms: string;
  contact: string;
  // Images
  images?: string[];
  // Legacy string address
  address: string;
}

export type AccommodationFormErrors = Partial<
  Record<keyof AccommodationFormValues, string>
>;

export interface CreateAccommodationPayload {
  title: string;
  price: number;
  address:
    | {
        city: string;
        district: string;
        ward?: string;
        street?: string;
      }
    | string;
  roomType?: string;
  description?: string;
  area?: number;
  maxOccupants?: number;
  deposit?: number;
  availableFrom?: string | null;
  extraCosts?: {
    electricity?: number;
    water?: number;
    internet?: number;
    other?: string;
  };
  amenities?: string[];
  rentalTerms?: string;
  contact?: string;
  contactPhone?: string;
  images?: string[];
}

export const EMPTY_ACCOMMODATION_FORM: AccommodationFormValues = {
  title: "",
  address: "",
  price: "",
  city: "",
  district: "",
  ward: "",
  street: "",
  roomType: "single",
  area: "",
  maxOccupants: "",
  deposit: "",
  availableFrom: "",
  electricity: "",
  water: "",
  internet: "",
  otherCost: "",
  amenities: [],
  description: "",
  rentalTerms: "",
  contact: "",
  images: [],
};

// Accept plain VND amounts or consistently grouped thousands, not decimals/exponents.
export function parseRentAmount(input: string): number | null {
  const value = input.trim().replace(/[\s\u00a0]/g, "");
  if (!value) return 0;
  const isDigits = /^\d+$/.test(value);
  const isGrouped = /^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/.test(value);
  if (!isDigits && !isGrouped) return null;

  const amount = Number(value.replace(/[.,]/g, ""));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function formatAvailableDate(input?: string): string | null {
  if (!input) return null;
  const val = input.trim();
  if (!val) return null;
  const ddmmyyyy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(val);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return null;
}

export function validateAccommodationForm(
  values: AccommodationFormValues,
): AccommodationFormErrors {
  const errors: AccommodationFormErrors = {};
  
  // 1. Tiêu đề bắt buộc
  if (!values.title.trim()) {
    errors.title = "Vui lòng nhập tiêu đề bài đăng.";
  }

  // 2. Giá thuê: bắt buộc, số > 0
  const price = parseRentAmount(values.price);
  if (!values.price?.trim()) {
    errors.price = "Vui lòng nhập giá thuê.";
  } else if (price === null) {
    errors.price = "Giá thuê phải là số nguyên không âm";
  } else if (price <= 0) {
    errors.price = "Giá thuê phải lớn hơn 0.";
  }

  // 3. Tiền cọc: bắt buộc, số > 0
  const deposit = parseRentAmount(values.deposit);
  if (!values.deposit?.trim()) {
    errors.deposit = "Vui lòng nhập tiền cọc.";
  } else if (deposit === null) {
    errors.deposit = "Tiền cọc phải là số nguyên không âm";
  } else if (deposit <= 0) {
    errors.deposit = "Tiền cọc phải lớn hơn 0.";
  }

  // 4. Mô tả: bắt buộc, ít nhất 20 ký tự
  if (!values.description?.trim()) {
    errors.description = "Vui lòng nhập mô tả phòng.";
  } else if (values.description.trim().length < 20) {
    errors.description = "Mô tả phòng phải có ít nhất 20 ký tự.";
  }

  // 5. Địa chỉ: tất cả bắt buộc
  if (!values.city?.trim()) errors.city = "Vui lòng nhập tỉnh/thành phố.";
  if (!values.district?.trim()) errors.district = "Vui lòng nhập quận/huyện.";
  if (!values.ward?.trim()) errors.ward = "Vui lòng nhập phường/xã.";
  if (!values.street?.trim()) errors.street = "Vui lòng nhập số nhà, đường.";

  // 6. Diện tích: bắt buộc, số > 0
  if (!values.area?.trim()) {
    errors.area = "Vui lòng nhập diện tích.";
  } else {
    const areaNum = Number(values.area.trim().replace(/,/g, "."));
    if (isNaN(areaNum) || areaNum <= 0) {
      errors.area = "Diện tích phải là số lớn hơn 0.";
    }
  }

  // 7. Số người tối đa: bắt buộc, số > 0
  if (!values.maxOccupants?.trim()) {
    errors.maxOccupants = "Vui lòng nhập số người tối đa.";
  } else {
    const occupants = Number(values.maxOccupants.trim());
    if (isNaN(occupants) || occupants <= 0 || !Number.isInteger(occupants)) {
      errors.maxOccupants = "Số người phải là số nguyên lớn hơn 0.";
    }
  }

  // 8. Ngày dọn vào: bắt buộc
  if (!values.availableFrom?.trim()) {
    errors.availableFrom = "Vui lòng chọn ngày có thể dọn vào.";
  }

  // 9. Giá điện: bắt buộc, số > 0
  const elec = parseRentAmount(values.electricity);
  if (!values.electricity?.trim()) {
    errors.electricity = "Vui lòng nhập giá điện.";
  } else if (elec === null) {
    errors.electricity = "Giá điện phải là số nguyên dương.";
  } else if (elec == 0) {
    errors.electricity = "Giá điện phải lớn hơn 0.";
  }

  // 10. Giá nước: bắt buộc, số > 0
  const water = parseRentAmount(values.water);
  if (!values.water?.trim()) {
    errors.water = "Vui lòng nhập giá nước.";
  } else if (water === null) {
    errors.water = "Giá nước phải là số hợp lệ.";
  } else if (water <= 0) {
    errors.water = "Giá nước phải lớn hơn 0.";
  }

  // 11. Internet: bắt buộc, số > 0
  const internet = parseRentAmount(values.internet);
  if (!values.internet?.trim()) {
    errors.internet = "Vui lòng nhập tiền internet.";
  } else if (internet === null) {
    errors.internet = "Tiền internet phải là số hợp lệ.";
  } else if (internet <= 0) {
    errors.internet = "Tiền internet phải lớn hơn 0.";
  }

  // 12. Chi phí khác: bắt buộc, số >= 0
  if (!values.otherCost?.trim()) {
    errors.otherCost = "Vui lòng nhập chi phí khác (nhập 0 nếu không có).";
  } else {
    const other = parseRentAmount(values.otherCost);
    if (other === null || other < 0) {
      errors.otherCost = "Chi phí khác phải là số không âm.";
    }
  }

  // 13. Điều khoản thuê: bắt buộc
  if (!values.rentalTerms?.trim()) {
    errors.rentalTerms = "Vui lòng nhập điều khoản thuê.";
  }

  // 14. Số điện thoại: bắt buộc, 10 số, bắt đầu bằng 0
  if (!values.contact?.trim()) {
    errors.contact = "Vui lòng nhập số điện thoại liên hệ.";
  } else {
    const phone = values.contact.trim().replace(/[\s\-]/g, ""); // Xóa space và dấu -
    if (!/^0\d{9}$/.test(phone)) {
      errors.contact = "Số điện thoại phải gồm 10 số và bắt đầu bằng 0.";
    }
  }

  return errors;
}

export function buildAccommodationPayload(
  values: AccommodationFormValues,
): CreateAccommodationPayload {
  const price = parseRentAmount(values.price);
  if (Object.keys(validateAccommodationForm(values)).length || price === null) {
    throw new Error("Vui lòng kiểm tra lại thông tin phòng.");
  }

  const hasDistrict = Boolean(values.district?.trim());
  const hasCity = Boolean(values.city?.trim());
  const hasStructured = hasDistrict || hasCity;

  if (hasStructured) {
    const electricity = values.electricity?.trim()
      ? parseRentAmount(values.electricity) ?? undefined
      : undefined;
    const water = values.water?.trim()
      ? parseRentAmount(values.water) ?? undefined
      : undefined;
    const internet = values.internet?.trim()
      ? parseRentAmount(values.internet) ?? undefined
      : undefined;
    const other = values.otherCost?.trim() || undefined;

    const extraCosts =
      electricity !== undefined ||
      water !== undefined ||
      internet !== undefined ||
      other !== undefined
        ? { electricity, water, internet, other }
        : undefined;

    const areaNum = values.area?.trim()
      ? Number(values.area.trim().replace(/,/g, "."))
      : undefined;
    const occupantsNum = values.maxOccupants?.trim()
      ? Number(values.maxOccupants.trim())
      : undefined;
    const depositNum = values.deposit?.trim()
      ? parseRentAmount(values.deposit) ?? undefined
      : undefined;

    return {
      title: values.title.trim(),
      price,
      address: {
        city: values.city.trim(),
        district: values.district.trim(),
        ward: values.ward.trim(),
        street: values.street.trim(),
      },
      roomType: values.roomType?.trim() || "single",
      description: values.description?.trim() || undefined,
      area: Number.isFinite(areaNum) && (areaNum ?? 0) > 0 ? areaNum : undefined,
      maxOccupants:
        Number.isFinite(occupantsNum) && (occupantsNum ?? 0) > 0
          ? occupantsNum
          : undefined,
      deposit: depositNum,
      availableFrom: formatAvailableDate(values.availableFrom),
      extraCosts,
      amenities: Array.isArray(values.amenities) ? values.amenities : [],
      rentalTerms: values.rentalTerms?.trim() || undefined,
      contact: values.contact?.trim() || undefined,
      contactPhone: values.contact?.trim() || undefined,
      images: Array.isArray(values.images) ? values.images : [],
    };
  }

  // Legacy contract
  return {
    title: values.title.trim(),
    address: values.address ? values.address.trim() : "",
    price,
    description: values.description ? values.description.trim() : "",
    contact: values.contact ? values.contact.trim() : "",
  };
}

export function accommodationErrorMessage(
  error: unknown,
  fallback = "Không thể đăng tin. Vui lòng thử lại.",
): string {
  const err = error as {
    code?: string;
    response?: {
      status?: number;
      data?: { message?: unknown; errors?: { message?: unknown }[] };
    };
  } | null;
  const data = err?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (Array.isArray(data?.errors)) {
    const messages = data.errors
      .map((entry) => entry?.message)
      .filter(
        (message): message is string =>
          typeof message === "string" && !!message.trim(),
      );
    if (messages.length) return messages.join("\n");
  }
  if (err?.response?.status === 401) {
    return "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.";
  }
  if (err?.response?.status === 403) {
    return "Máy chủ từ chối thao tác này. Vui lòng kiểm tra lại quyền tài khoản.";
  }
  if (err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT") {
    return "Máy chủ phản hồi chậm. Vui lòng thử lại sau ít phút.";
  }
  if (err?.code === "ERR_NETWORK") {
    return "Không kết nối được máy chủ. Kiểm tra kết nối mạng rồi thử lại.";
  }
  return fallback;
}
