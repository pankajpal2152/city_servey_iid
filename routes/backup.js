router.post('/api-post-add-update-event-new-registration-details', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_NEW_REGISTRATION_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_NEW_REGISTRATION_DETAILS', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      const requestJsonData = JSON.parse(requestJson);
      if (requestJsonData[0].ITEM == 'UPDATE_STATUS' && requestJsonData[0].STATUS == 'Approved') {
        const obj = {
          EVENT_SYS_ID: requestJsonData[0].EVENT_SYS_ID,
          REGISTRATION_SYS_ID: requestJsonData[0].EMP_ID
        }
        const mailStatus = await sendRegistrationApprovalNotification(obj);
      }
      else if (requestJsonData[0].ITEM == 'ADD') {
        const ids = result.REGISTRATION_SYS_IDS;
        for (const id of ids) {
          const obj = {
            EVENT_SYS_ID: result.EVENT_SYS_ID,
            REGISTRATION_SYS_ID: id
          }
          const mailStatus = await sendRegistrationSuccessfullNotification(obj);
        }
      }
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});